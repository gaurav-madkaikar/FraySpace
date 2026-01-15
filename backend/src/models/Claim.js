const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Thread',
        required: true,
        index: true
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: true
    },
    claimText: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['verified', 'unverified', 'disputed', 'uncertain', 'pending'],
        default: 'pending'
    },
    evidence: [{
        source: {
            type: String,
            required: true
        },
        url: String,
        snippet: String,
        credibilityScore: {
            type: Number,
            min: 0,
            max: 1
        },
        supports: {
            type: Boolean,
            default: true
        },
        foundAt: {
            type: Date,
            default: Date.now
        }
    }],
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },
    explanation: {
        type: String,
        maxlength: 2000
    },
    checkedAt: {
        type: Date,
        default: null
    },
    checkedBy: {
        type: String,
        enum: ['llm', 'user', 'moderator'],
        default: 'llm'
    },
    modelUsed: {
        type: String
    },
    userFeedback: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: String,
            enum: ['helpful', 'not_helpful', 'incorrect']
        },
        comment: String,
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }],
    relatedClaims: [{
        claimId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Claim'
        },
        relationship: {
            type: String,
            enum: ['supports', 'contradicts', 'clarifies', 'related']
        }
    }]
}, {
    timestamps: true
});

// Indexes
claimSchema.index({ threadId: 1, status: 1 });
claimSchema.index({ messageId: 1 });
claimSchema.index({ checkedAt: -1 });

const Claim = mongoose.model('Claim', claimSchema);

module.exports = Claim;

