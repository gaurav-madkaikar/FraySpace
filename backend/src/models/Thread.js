const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    topicTags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    mode: {
        type: String,
        enum: ['casual', 'debate', 'planning', 'brainstorm', 'general'],
        default: 'general'
    },
    interventionLevel: {
        type: String,
        enum: ['minimal', 'balanced', 'active'],
        default: 'balanced'
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participantIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    moderatorIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    conversationState: {
        activeTopic: {
            type: String,
            default: ''
        },
        unresolvedQuestions: [{
            question: String,
            askedAt: Date,
            askedBy: mongoose.Schema.Types.ObjectId
        }],
        decisionsMade: [{
            decision: String,
            madeAt: Date,
            participants: [mongoose.Schema.Types.ObjectId]
        }],
        keyPoints: [{
            point: String,
            addedAt: Date,
            supportingMessageIds: [mongoose.Schema.Types.ObjectId]
        }],
        areasOfAgreement: [String],
        areasOfDisagreement: [String]
    },
    lastSummaryAt: {
        type: Date,
        default: null
    },
    messageCount: {
        type: Number,
        default: 0
    },
    settings: {
        autoSummaryEnabled: {
            type: Boolean,
            default: true
        },
        summaryFrequency: {
            type: Number,
            default: 15 // messages
        },
        autoFactCheckEnabled: {
            type: Boolean,
            default: true
        },
        allowAnonymous: {
            type: Boolean,
            default: false
        }
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isClosed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
threadSchema.index({ ownerId: 1 });
threadSchema.index({ topicTags: 1 });
threadSchema.index({ mode: 1 });
threadSchema.index({ visibility: 1 });
threadSchema.index({ createdAt: -1 });

// Virtual for checking if summary is due
threadSchema.virtual('isSummaryDue').get(function () {
    if (!this.settings.autoSummaryEnabled) return false;
    if (!this.lastSummaryAt) return this.messageCount >= this.settings.summaryFrequency;

    const messagesSinceLastSummary = this.messageCount - (this.lastSummaryAt ? this.messagesSinceLastSummaryCount || 0 : 0);
    return messagesSinceLastSummary >= this.settings.summaryFrequency;
});

const Thread = mongoose.model('Thread', threadSchema);

module.exports = Thread;

