const { generateCompletion } = require('./ollamaClient');
const Thread = require('../models/Thread');
const Message = require('../models/Message');

/**
 * Generate a living summary for a thread
 * @param {string} threadId - Thread ID
 * @param {number} messageLimit - Number of recent messages to consider
 * @returns {Promise<object>} - Generated summary
 */
async function generateSummary(threadId, messageLimit = 20) {
  try {
    // Fetch thread details
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Fetch recent messages
    const messages = await Message.find({
      threadId,
      isDeleted: false,
      messageType: 'user'
    })
      .populate('authorId', 'username displayName')
      .sort({ createdAt: -1 })
      .limit(messageLimit);

    // Reverse to chronological order
    messages.reverse();

    // Format messages for prompt
    const formattedMessages = messages.map((msg, idx) =>
      `[${idx + 1}] ${msg.authorId?.displayName || msg.authorId?.username || 'Anonymous'}: ${msg.content}`
    ).join('\n\n');

    // Get previous summary if exists
    const previousSummary = thread.conversationState?.activeTopic || 'None yet';

    // Build prompt
    const prompt = buildSummaryPrompt({
      title: thread.title,
      mode: thread.mode,
      messages: formattedMessages,
      previousSummary,
      messageCount: messages.length
    });

    // Generate summary using Ollama
    const result = await generateCompletion(prompt, {
      format: 'json',
      temperature: 0.7,
      system: 'You are a neutral facilitator helping to summarize threaded discussions.'
    });

    return {
      summary: result.response,
      processingTime: result.processingTime,
      modelUsed: result.model,
      messagesAnalyzed: messages.length
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

/**
 * Build the summary prompt
 */
function buildSummaryPrompt({ title, mode, messages, previousSummary, messageCount }) {
  return `You are a neutral facilitator for a threaded discussion. Generate a living summary.

Thread Title: "${title}"
Thread Mode: ${mode}
Message Count: ${messageCount}

Recent Messages:
${messages}

Previous Summary:
${previousSummary}

Generate a JSON response with the following structure:
{
  "whatThisThreadIsAbout": "Brief 1-2 sentence overview of the thread's topic and purpose",
  "keyPointsSoFar": ["Point 1", "Point 2", "Point 3"],
  "areasOfAgreement": ["Agreement 1", "Agreement 2"],
  "areasOfDisagreement": ["Disagreement 1", "Disagreement 2"],
  "openQuestions": ["Question 1", "Question 2"],
  "nextSteps": ["Step 1", "Step 2"],
  "sourcesCited": []
}

Keep the summary objective, balanced, and focused on what was actually discussed.`;
}

/**
 * Check if a thread needs a summary update
 */
function shouldGenerateSummary(thread) {
  if (!thread.settings.autoSummaryEnabled) {
    return false;
  }

  if (!thread.lastSummaryAt) {
    return thread.messageCount >= thread.settings.summaryFrequency;
  }

  // Calculate messages since last summary (simplified approach)
  const messagesSinceLastSummary = thread.messageCount;
  return messagesSinceLastSummary >= thread.settings.summaryFrequency;
}

module.exports = {
  generateSummary,
  shouldGenerateSummary,
  buildSummaryPrompt
};

