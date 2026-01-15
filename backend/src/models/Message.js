const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Thread',
        required: true,
        index: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000
    },
    messageType: {
        type: String,
        enum: ['user', 'llm_intervention', 'llm_summary', 'llm_fact_check', 'system'],
        default: 'user'
    },
    claimMarkers: [{
        claimText: {
            type: String,
            required: true
        },
        startIndex: Number,
        endIndex: Number,
        confidence: {
            type: Number,
            min: 0,
            max: 1
        },
        claimType: {
            type: String,
            enum: ['factual', 'statistical', 'health', 'legal', 'financial', 'scientific', 'other']
        },
        shouldVerify: {
            type: Boolean,
            default: false
        }
    }],
    references: [{
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'
        },
        quotedText: String
    }],
    reactions: [{
        emoji: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    editHistory: [{
        previousContent: String,
        editedAt: Date,
        editReason: String
    }],
    interventionMetadata: {
        reason: String, // Why the LLM intervened
        triggerType: String, // 'automatic', 'explicit_request', 'threshold', 'claim_detected'
        processingTime: Number, // ms
        modelUsed: String
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ authorId: 1 });
messageSchema.index({ messageType: 1 });

// Pre-save hook to increment thread message count
messageSchema.pre('save', async function (next) {
    if (this.isNew && this.messageType === 'user') {
        try {
            const Thread = mongoose.model('Thread');
            await Thread.findByIdAndUpdate(this.threadId, {
                $inc: { messageCount: 1 }
            });
        } catch (error) {
            console.error('Error updating thread message count:', error);
        }
    }
    next();
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

