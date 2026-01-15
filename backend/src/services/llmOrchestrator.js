const { shouldIntervene } = require('./interventionPolicy');
const { generateSummary } = require('./summaryService');
const { factCheckClaim } = require('./factCheckService');
const Message = require('../models/Message');
const Thread = require('../models/Thread');

/**
 * Main LLM orchestration service
 * Coordinates all LLM interventions based on policy and context
 */
class LLMOrchestrator {
  /**
   * Process a new message and determine if intervention is needed
   */
  async processNewMessage(threadId, message) {
    try {
      const decision = await shouldIntervene(threadId, {
        newMessage: message
      });

      if (!decision.shouldIntervene) {
        return { intervened: false, reason: decision.reason };
      }

      // Execute intervention based on action type
      switch (decision.actionType) {
        case 'summary':
          return await this.generateAndPostSummary(threadId, decision);

        case 'fact_check':
          return await this.performFactCheck(threadId, message, decision);

        case 'observation':
          return await this.postObservation(threadId, decision);

        default:
          return { intervened: false, reason: 'Unknown action type' };
      }
    } catch (error) {
      console.error('Error in LLM orchestration:', error);
      return { intervened: false, error: error.message };
    }
  }

  /**
   * Handle explicit user requests for LLM actions
   */
  async handleExplicitRequest(threadId, requestType, context = {}) {
    try {
      const decision = {
        shouldIntervene: true,
        reason: 'Explicit user request',
        actionType: requestType,
        priority: 'high'
      };

      switch (requestType) {
        case 'summarize':
          return await this.generateAndPostSummary(threadId, decision);

        case 'fact-check':
          if (!context.claimText) {
            throw new Error('Claim text required for fact-checking');
          }
          return await this.performFactCheck(
            threadId,
            { content: context.claimText, _id: context.messageId },
            decision
          );

        case 'resolve':
          return await this.generateResolution(threadId, decision);

        default:
          throw new Error(`Unknown request type: ${requestType}`);
      }
    } catch (error) {
      console.error('Error handling explicit request:', error);
      throw error;
    }
  }

  /**
   * Generate and post a summary
   */
  async generateAndPostSummary(threadId, decision) {
    try {
      const result = await generateSummary(threadId);

      // Create LLM intervention message
      const interventionMessage = new Message({
        threadId,
        authorId: null, // System message
        content: this.formatSummaryForDisplay(result.summary),
        messageType: 'llm_summary',
        interventionMetadata: {
          reason: decision.reason,
          triggerType: decision.priority === 'high' ? 'explicit_request' : 'automatic',
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        }
      });

      await interventionMessage.save();

      // Update thread state
      const thread = await Thread.findById(threadId);
      thread.conversationState = {
        ...thread.conversationState,
        activeTopic: result.summary.whatThisThreadIsAbout,
        keyPoints: result.summary.keyPointsSoFar.map(point => ({
          point,
          addedAt: new Date(),
          supportingMessageIds: []
        })),
        areasOfAgreement: result.summary.areasOfAgreement,
        areasOfDisagreement: result.summary.areasOfDisagreement
      };
      thread.lastSummaryAt = new Date();
      await thread.save();

      return {
        intervened: true,
        actionType: 'summary',
        message: interventionMessage,
        summary: result.summary
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Perform fact-check and post results
   */
  async performFactCheck(threadId, message, decision) {
    try {
      const claimText = decision.claimText || message.content;

      const result = await factCheckClaim(claimText, message.content);

      // Create LLM intervention message
      const interventionMessage = new Message({
        threadId,
        authorId: null,
        content: this.formatFactCheckForDisplay(claimText, result),
        messageType: 'llm_fact_check',
        interventionMetadata: {
          reason: decision.reason,
          triggerType: decision.priority === 'high' ? 'explicit_request' : 'automatic',
          processingTime: result.processingTime,
          modelUsed: result.modelUsed
        }
      });

      await interventionMessage.save();

      return {
        intervened: true,
        actionType: 'fact_check',
        message: interventionMessage,
        claim: result
      };
    } catch (error) {
      console.error('Error performing fact-check:', error);
      throw error;
    }
  }

  /**
   * Post an observation or note
   */
  async postObservation(threadId, decision) {
    try {
      const content = this.formatObservation(decision);

      const interventionMessage = new Message({
        threadId,
        authorId: null,
        content,
        messageType: 'llm_intervention',
        interventionMetadata: {
          reason: decision.reason,
          triggerType: 'automatic',
          processingTime: 0,
          modelUsed: 'rule-based'
        }
      });

      await interventionMessage.save();

      return {
        intervened: true,
        actionType: 'observation',
        message: interventionMessage
      };
    } catch (error) {
      console.error('Error posting observation:', error);
      throw error;
    }
  }

  /**
   * Generate thread resolution
   */
  async generateResolution(threadId, decision) {
    // TODO: Implement resolution generation
    return {
      intervened: false,
      reason: 'Resolution generation not yet implemented'
    };
  }

  /**
   * Format summary for display
   */
  formatSummaryForDisplay(summary) {
    return `📊 **Thread Summary**

**What this is about:** ${summary.whatThisThreadIsAbout}

**Key Points:**
${summary.keyPointsSoFar.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

${summary.areasOfAgreement.length > 0 ? `**Areas of Agreement:**
${summary.areasOfAgreement.map(point => `✓ ${point}`).join('\n')}` : ''}

${summary.areasOfDisagreement.length > 0 ? `**Areas of Disagreement:**
${summary.areasOfDisagreement.map(point => `⚠ ${point}`).join('\n')}` : ''}

${summary.openQuestions.length > 0 ? `**Open Questions:**
${summary.openQuestions.map(q => `❓ ${q}`).join('\n')}` : ''}

${summary.nextSteps.length > 0 ? `**Suggested Next Steps:**
${summary.nextSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}` : ''}`;
  }

  /**
   * Format fact-check results for display
   */
  formatFactCheckForDisplay(claimText, result) {
    const statusEmoji = {
      verified: '✅',
      unverified: '❓',
      disputed: '❌',
      uncertain: '⚠️'
    };

    return `🔍 **Fact Check**

**Claim:** "${claimText}"

**Status:** ${statusEmoji[result.status]} ${result.status.toUpperCase()}
**Confidence:** ${(result.confidence * 100).toFixed(0)}%

**Explanation:** ${result.explanation}

${result.evidence.length > 0 ? `**Sources:**
${result.evidence.slice(0, 3).map((ev, idx) => `${idx + 1}. ${ev.source}\n   ${ev.url}`).join('\n\n')}` : ''}`;
  }

  /**
   * Format observation message
   */
  formatObservation(decision) {
    return `💡 **Facilitator Note**

${decision.reason}

${decision.details ? JSON.stringify(decision.details, null, 2) : ''}`;
  }
}

// Export singleton instance
module.exports = new LLMOrchestrator();

