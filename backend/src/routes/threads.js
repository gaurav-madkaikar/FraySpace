const express = require('express');
const router = express.Router();
const Thread = require('../models/Thread');
const Message = require('../models/Message');
const { validateThread } = require('../middleware/validation');
// const { authenticate } = require('../middleware/auth');

// TODO: Add authentication middleware when auth is implemented
// For now, we'll use a mock user ID for development

// GET /api/threads - List all threads with filtering
router.get('/', async (req, res) => {
    try {
        const { mode, visibility, tags, search, limit = 20, skip = 0 } = req.query;

        const query = { isArchived: false };

        if (mode) query.mode = mode;
        if (visibility) query.visibility = visibility;
        if (tags) {
            const tagArray = tags.split(',').map(t => t.trim().toLowerCase());
            query.topicTags = { $in: tagArray };
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const threads = await Thread.find(query)
            .populate('ownerId', 'username displayName avatar')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Thread.countDocuments(query);

        res.json({
            threads,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/threads/:id - Get thread details
router.get('/:id', async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id)
            .populate('ownerId', 'username displayName avatar')
            .populate('participantIds', 'username displayName avatar')
            .populate('moderatorIds', 'username displayName avatar');

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        res.json(thread);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/threads - Create new thread
router.post('/', validateThread, async (req, res) => {
    try {
        // TODO: Get actual user ID from authentication
        const mockUserId = '000000000000000000000001'; // Temporary for development

        const thread = new Thread({
            ...req.body,
            ownerId: mockUserId,
            participantIds: [mockUserId]
        });

        await thread.save();
        await thread.populate('ownerId', 'username displayName avatar');

        res.status(201).json(thread);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/threads/:id - Update thread
router.patch('/:id', validateThread, async (req, res) => {
    try {
        const allowedUpdates = [
            'title', 'description', 'topicTags', 'mode', 'interventionLevel',
            'visibility', 'settings', 'isClosed'
        ];

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        const thread = await Thread.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).populate('ownerId', 'username displayName avatar');

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Emit update to connected clients
        const io = req.app.get('io');
        io.to(`thread_${thread._id}`).emit('thread_updated', thread);

        res.json(thread);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/threads/:id - Delete thread
router.delete('/:id', async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Soft delete - archive instead of removing
        thread.isArchived = true;
        await thread.save();

        res.json({ message: 'Thread archived successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/threads/:id/messages - Get messages for a thread
router.get('/:id/messages', async (req, res) => {
    try {
        const { limit = 50, skip = 0, before, after } = req.query;

        const query = {
            threadId: req.params.id,
            isDeleted: false
        };

        if (before) query.createdAt = { $lt: new Date(before) };
        if (after) query.createdAt = { $gt: new Date(after) };

        const messages = await Message.find(query)
            .populate('authorId', 'username displayName avatar')
            .sort({ createdAt: 1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Message.countDocuments(query);

        res.json({
            messages,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: total > parseInt(skip) + parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/threads/:id/messages - Create new message in thread
router.post('/:id/messages', async (req, res) => {
    try {
        const thread = await Thread.findById(req.params.id);

        if (!thread) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        if (thread.isClosed) {
            return res.status(403).json({ error: 'Thread is closed' });
        }

        // TODO: Get actual user ID from authentication
        const mockUserId = '000000000000000000000001';

        const message = new Message({
            threadId: req.params.id,
            authorId: mockUserId,
            content: req.body.content,
            messageType: 'user',
            references: req.body.references || []
        });

        await message.save();
        await message.populate('authorId', 'username displayName avatar');

        // Emit new message to connected clients
        const io = req.app.get('io');
        io.to(`thread_${thread._id}`).emit('new_message', message);

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;

