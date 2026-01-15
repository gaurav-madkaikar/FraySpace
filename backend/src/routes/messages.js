const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
// const { authenticate } = require('../middleware/auth');

// GET /api/messages/:id - Get specific message
router.get('/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id)
            .populate('authorId', 'username displayName avatar')
            .populate('references.messageId', 'content authorId createdAt');

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.isDeleted) {
            return res.status(410).json({ error: 'Message has been deleted' });
        }

        res.json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/messages/:id - Edit message
router.patch('/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.isDeleted) {
            return res.status(410).json({ error: 'Cannot edit deleted message' });
        }

        // TODO: Check if user is the author

        // Save edit history
        message.editHistory.push({
            previousContent: message.content,
            editedAt: new Date(),
            editReason: req.body.editReason || ''
        });

        message.content = req.body.content;
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();
        await message.populate('authorId', 'username displayName avatar');

        // Emit update to connected clients
        const io = req.app.get('io');
        io.to(`thread_${message.threadId}`).emit('message_updated', message);

        res.json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // TODO: Check if user is the author or moderator

        // Soft delete
        message.isDeleted = true;
        message.content = '[Message deleted]';
        await message.save();

        // Emit update to connected clients
        const io = req.app.get('io');
        io.to(`thread_${message.threadId}`).emit('message_deleted', { messageId: message._id });

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/messages/:id/reactions - Add reaction to message
router.post('/:id/reactions', async (req, res) => {
    try {
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({ error: 'Emoji is required' });
        }

        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // TODO: Get actual user ID from authentication
        const mockUserId = '000000000000000000000001';

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
            r => r.emoji === emoji && r.userId.toString() === mockUserId
        );

        if (existingReaction) {
            // Remove reaction (toggle)
            message.reactions = message.reactions.filter(
                r => !(r.emoji === emoji && r.userId.toString() === mockUserId)
            );
        } else {
            // Add reaction
            message.reactions.push({
                emoji,
                userId: mockUserId,
                addedAt: new Date()
            });
        }

        await message.save();

        // Emit update to connected clients
        const io = req.app.get('io');
        io.to(`thread_${message.threadId}`).emit('message_reaction', {
            messageId: message._id,
            reactions: message.reactions
        });

        res.json({ reactions: message.reactions });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET /api/messages/:id/edit-history - Get edit history
router.get('/:id/edit-history', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id)
            .select('editHistory isEdited editedAt');

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({
            isEdited: message.isEdited,
            editedAt: message.editedAt,
            history: message.editHistory
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

