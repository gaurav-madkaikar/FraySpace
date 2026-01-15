const Thread = require('../models/Thread');
const Message = require('../models/Message');

/**
 * Determine if LLM should intervene in a thread
 * @param {string} threadId - Thread ID
 * @param {object} context - Additional context (new message, user request, etc.)
 * @returns {Promise<object>} - Intervention decision
 */
async function shouldIntervene(threadId, context = {}) {
  try {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return { shouldIntervene: false, reason: 'Thread not found' };
    }
    
    // Check intervention level
    if (thread.interventionLevel === 'minimal') {
      // Only intervene on explicit requests
      if (context.explicitRequest) {
        return {
          shouldIntervene: true,
          reason: 'Explicit user request',
          actionType: context.requestType || 'summary',
          priority: 'high'
        };
      }
      return { shouldIntervene: false, reason: 'Minimal intervention mode' };
    }
    
    // Check for explicit requests (always honor these)
    if (context.explicitRequest) {
      return {
        shouldIntervene: true,
        reason: 'Explicit user request',
        actionType: context.requestType || 'summary',
        priority: 'high'
      };
    }
    
    // Check message count threshold
    if (thread.settings.autoSummaryEnabled) {
      const messagesSinceLastSummary = await getMessagesSinceLastSummary(thread);
      
      if (messagesSinceLastSummary >= thread.settings.summaryFrequency) {
        return {
          shouldIntervene: true,
          reason: `Message threshold reached (${messagesSinceLastSummary} messages)`,
          actionType: 'summary',
          priority: 'normal'
        };
      }
    }
    
    // Check for high-impact claims (active mode only)
    if (thread.interventionLevel === 'active' && context.newMessage) {
      const hasHighImpactClaim = await detectHighImpactClaim(context.newMessage.content);
      
      if (hasHighImpactClaim) {
        return {
          shouldIntervene: true,
          reason: 'High-impact claim detected',
          actionType: 'fact_check',
          priority: 'high',
          claimText: hasHighImpactClaim.claimText
        };
      }
    }
    
    // Check for contradiction detection (balanced and active modes)
    if (thread.interventionLevel !== 'minimal' && context.newMessage) {
      const contradiction = await detectContradiction(threadId, context.newMessage);
      
      if (contradiction) {
        return {
          shouldIntervene: true,
          reason: 'Potential contradiction detected',
          actionType: 'observation',
          priority: 'normal',
          details: contradiction
        };
      }
    }
    
    // Check for user reactions requesting fact-check
    if (context.reaction && context.reaction.emoji === '🧾') {
      return {
        shouldIntervene: true,
        reason: 'User requested source verification',
        actionType: 'fact_check',
        priority: 'normal'
      };
    }
    
    return { shouldIntervene: false, reason: 'No intervention triggers met' };
  } catch (error) {
    console.error('Error in intervention policy:', error);
    return { shouldIntervene: false, reason: 'Error evaluating policy' };
  }
}

/**
 * Get count of messages since last summary
 */
async function getMessagesSinceLastSummary(thread) {
  if (!thread.lastSummaryAt) {
    return thread.messageCount;
  }
  
  const count = await Message.countDocuments({
    threadId: thread._id,
    messageType: 'user',
    createdAt: { $gt: thread.lastSummaryAt }
  });
  
  return count;
}

/**
 * Detect high-impact claims that require verification
 */
async function detectHighImpactClaim(messageContent) {
  // Keywords that indicate high-impact claims
  const highImpactPatterns = [
    // Health claims
    /(?:cures?|treats?|prevents?|causes?|heals?)\s+(?:cancer|diabetes|disease|illness)/i,
    /(?:studies? show|research shows|proven to)/i,
    
    // Financial/Legal claims
    /(?:illegal|unlawful|against the law|felony|misdemeanor)/i,
    /(?:\$\d+|\d+%)\s+(?:return|profit|guaranteed)/i,
    
    // Statistical claims with specific numbers
    /\d+%\s+of\s+(?:people|Americans|users|patients)/i,
    /studies? (?:show|prove|demonstrate) that/i,
    
    // Definitive statements
    /(?:always|never|every|all|none)\s+(?:causes?|results? in|leads? to)/i
  ];
  
  for (const pattern of highImpactPatterns) {
    const match = messageContent.match(pattern);
    if (match) {
      return {
        claimText: match[0],
        type: 'high_impact',
        confidence: 0.8
      };
    }
  }
  
  return null;
}

/**
 * Detect contradictions between messages
 * TODO: Implement sophisticated contradiction detection using LLM
 */
async function detectContradiction(threadId, newMessage) {
  // Placeholder implementation
  // In a full implementation, this would:
  // 1. Fetch recent messages
  // 2. Use LLM to detect semantic contradictions
  // 3. Return details about conflicting statements
  
  return null;
}

/**
 * Evaluate intervention priority
 */
function evaluatePriority(interventionType, context) {
  const priorityMap = {
    explicit_request: 'high',
    high_impact_claim: 'high',
    threshold_reached: 'normal',
    contradiction: 'normal',
    observation: 'low'
  };
  
  return priorityMap[interventionType] || 'normal';
}

module.exports = {
  shouldIntervene,
  getMessagesSinceLastSummary,
  detectHighImpactClaim,
  detectContradiction,
  evaluatePriority
};

