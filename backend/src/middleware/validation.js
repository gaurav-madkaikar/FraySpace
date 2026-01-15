const Joi = require('joi');

/**
 * Thread validation schema
 */
const threadSchema = Joi.object({
    title: Joi.string().min(3).max(200).trim(),
    description: Joi.string().max(1000).trim().allow(''),
    visibility: Joi.string().valid('public', 'private', 'unlisted'),
    topicTags: Joi.array().items(Joi.string().trim().lowercase()),
    mode: Joi.string().valid('casual', 'debate', 'planning', 'brainstorm', 'general'),
    interventionLevel: Joi.string().valid('minimal', 'balanced', 'active'),
    settings: Joi.object({
        autoSummaryEnabled: Joi.boolean(),
        summaryFrequency: Joi.number().integer().min(5).max(100),
        autoFactCheckEnabled: Joi.boolean(),
        allowAnonymous: Joi.boolean()
    }),
    isClosed: Joi.boolean()
}).min(1); // At least one field must be present

/**
 * Message validation schema
 */
const messageSchema = Joi.object({
    content: Joi.string().min(1).max(10000).trim().required(),
    references: Joi.array().items(
        Joi.object({
            messageId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
            quotedText: Joi.string()
        })
    ),
    editReason: Joi.string().max(200).trim()
});

/**
 * Claim validation schema
 */
const claimSchema = Joi.object({
    claimText: Joi.string().min(1).max(500).trim().required(),
    messageId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
});

/**
 * User registration validation schema
 */
const userRegistrationSchema = Joi.object({
    username: Joi.string().min(3).max(30).trim().required(),
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string().min(8).max(100).required(),
    displayName: Joi.string().max(50).trim()
});

/**
 * User login validation schema
 */
const userLoginSchema = Joi.object({
    username: Joi.string().trim().required(),
    password: Joi.string().required()
});

/**
 * Generic validation middleware factory
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        req.body = value;
        next();
    };
};

/**
 * Query parameter validation
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Query validation failed',
                details: errors
            });
        }

        req.query = value;
        next();
    };
};

// Exported validation middleware
module.exports = {
    validate,
    validateQuery,
    validateThread: validate(threadSchema),
    validateMessage: validate(messageSchema),
    validateClaim: validate(claimSchema),
    validateUserRegistration: validate(userRegistrationSchema),
    validateUserLogin: validate(userLoginSchema)
};

