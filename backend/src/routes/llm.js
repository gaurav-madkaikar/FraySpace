const express = require('express');
const router = express.Router();
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const Claim = require('../models/Claim');
const { generateSummary } = require('../services/summaryService');
const { factCheckClaim } = require('../services/factCheckService');

// POST /api/llm/threads/:id/summarize - Generate or update thread summary
router.post('/threads/:id/summarize', async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Generate summary using LLM
        const summaryResult = await generateSummary(req.params.id);
        const summary = summaryResult.summary;

        // Update thread conversation state
        thread.conversationState = {
            ...thread.conversationState,
            keyPoints: summary.keyPointsSoFar.map(point => ({
                point,
                addedAt: new Date(),
                supportingMessageIds: []
            })),
            areasOfAgreement: summary.areasOfAgreement,
            areasOfDisagreement: summary.areasOfDisagreement
        };

        thread.lastSummaryAt = new Date();
        await thread.save();

        // Create LLM intervention message
        const summaryMessage = new Message({
            threadId: thread._id,
            authorId: null, // System message
            content: JSON.stringify(summary, null, 2),
            messageType: 'llm_summary',
            interventionMetadata: {
                reason: 'Manual summary request',
                triggerType: 'explicit_request',
                processingTime: summaryResult.processingTime || 0,
                modelUsed: summaryResult.modelUsed || 'gemma3:1b'
            }
        });

        await summaryMessage.save();

        // Emit to connected clients
        const io = req.app.get('io');
        io.to(`thread_${thread._id}`).emit('new_summary', {
            summary,
            message: summaryMessage
        });

        res.json({
            summary,
            message: summaryMessage,
            updatedAt: thread.lastSummaryAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/llm/threads/:id/fact-check - Fact-check a claim
router.post('/threads/:id/fact-check', async (req, res) => {
    try {
        const { claimText, messageId } = req.body;

        if (!claimText) {
            return res.status(400).json({ error: 'Claim text is required' });
        }

        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Fact-check the claim using LLM and web search
        const result = await factCheckClaim(claimText, thread.title);

        // Create claim record
        const claim = new Claim({
            threadId: thread._id,
            messageId: messageId || null,
            claimText,
            status: result.status,
            evidence: result.evidence,
            confidence: result.confidence,
            explanation: result.explanation,
            checkedAt: new Date(),
            checkedBy: 'llm',
            modelUsed: result.modelUsed || 'gemma3:1b'
        });

        await claim.save();

        // Create LLM intervention message
        const factCheckMessage = new Message({
            threadId: thread._id,
            authorId: null,
            content: `Fact-check result: ${result.explanation}`,
            messageType: 'llm_fact_check',
            interventionMetadata: {
                reason: 'Fact-check request',
                triggerType: 'explicit_request',
                processingTime: result.processingTime || 0,
                modelUsed: result.modelUsed || 'gemma3:1b'
            }
        });

        await factCheckMessage.save();

        // Emit to connected clients
        const io = req.app.get('io');
        io.to(`thread_${thread._id}`).emit('fact_check_complete', {
            claim,
            message: factCheckMessage
        });

        res.json({
            claim,
            message: factCheckMessage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/llm/threads/:id/claims - Get all claims for a thread
router.get('/threads/:id/claims', async (req, res) => {
    try {
        const { status } = req.query;

        const query = { threadId: req.params.id };
        if (status) query.status = status;

        const claims = await Claim.find(query)
            .populate('messageId', 'content authorId createdAt')
            .sort({ checkedAt: -1 });

        res.json({ claims });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/llm/threads/:id/resolve - Get resolution/conclusion
router.post('/threads/:id/resolve', async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // TODO: Implement actual resolution generation
        const resolution = {
            summary: 'Resolution generation not yet implemented',
            consensus: [],
            remainingDisagreements: [],
            actionItems: []
        };

        res.json({ resolution });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/llm/claims/:id/feedback - Submit feedback on claim verification
router.post('/claims/:id/feedback', async (req, res) => {
    try {
        const { rating, comment } = req.body;

        if (!rating) {
            return res.status(400).json({ error: 'Rating is required' });
        }

        const claim = await Claim.findById(req.params.id);

        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        // TODO: Get actual user ID from authentication
        const mockUserId = '000000000000000000000001';

        claim.userFeedback.push({
            userId: mockUserId,
            rating,
            comment: comment || '',
            submittedAt: new Date()
        });

        await claim.save();

        res.json({ message: 'Feedback submitted', claim });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

