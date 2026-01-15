const { generateCompletion } = require('./ollamaClient');
const { searchWeb } = require('../utils/webSearch');

/**
 * Fact-check a claim
 * @param {string} claimText - The claim to verify
 * @param {string} context - Additional context about the claim
 * @returns {Promise<object>} - Fact-check results
 */
async function factCheckClaim(claimText, context = '') {
  try {
    // Step 1: Search for evidence
    const searchResults = await searchWeb(claimText);
    
    // Format search results for LLM
    const formattedResults = searchResults.slice(0, 5).map((result, idx) => 
      `[${idx + 1}] ${result.title}\n   URL: ${result.url}\n   Snippet: ${result.snippet}`
    ).join('\n\n');
    
    // Step 2: Build fact-check prompt
    const prompt = buildFactCheckPrompt({
      claimText,
      context,
      searchResults: formattedResults
    });
    
    // Step 3: Get LLM analysis
    const result = await generateCompletion(prompt, {
      format: 'json',
      temperature: 0.3, // Lower temperature for more consistent fact-checking
      system: 'You are a careful fact-checker. Analyze claims objectively and cite sources.'
    });
    
    // Step 4: Format evidence
    const evidence = searchResults.slice(0, 5).map((result, idx) => ({
      source: result.title,
      url: result.url,
      snippet: result.snippet,
      credibilityScore: 0.7, // TODO: Implement source credibility scoring
      supports: true, // TODO: Determine from LLM analysis
      foundAt: new Date()
    }));
    
    return {
      status: result.response.status,
      confidence: result.response.confidence,
      evidence,
      explanation: result.response.explanation,
      processingTime: result.processingTime,
      modelUsed: result.model,
      searchResultsFound: searchResults.length
    };
  } catch (error) {
    console.error('Error fact-checking claim:', error);
    throw error;
  }
}

/**
 * Build fact-check prompt
 */
function buildFactCheckPrompt({ claimText, context, searchResults }) {
  return `You are a fact-checker. Analyze this claim and the evidence found.

Claim: "${claimText}"

${context ? `Context: ${context}` : ''}

Search Results:
${searchResults}

Analyze the claim based on the evidence and determine:

1. Status: Choose one of the following:
   - "verified": The claim is supported by reliable evidence
   - "unverified": No sufficient evidence found
   - "disputed": Evidence contradicts the claim
   - "uncertain": Mixed or unclear evidence

2. Confidence: A number between 0.0 and 1.0 indicating how confident you are in the assessment

3. Explanation: A clear 2-3 sentence explanation of your findings

Return your analysis as JSON:
{
  "status": "verified|unverified|disputed|uncertain",
  "confidence": 0.85,
  "explanation": "Your explanation here"
}`;
}

/**
 * Detect claims in text that should be fact-checked
 * @param {string} text - Text to analyze
 * @returns {Promise<Array>} - Detected claims
 */
async function detectClaims(text) {
  try {
    const prompt = `Analyze the following text and identify any factual claims that should be verified.

Text: "${text}"

Look for:
- Statistical claims (numbers, percentages, dates)
- Health or medical claims
- Legal or financial claims
- Historical facts
- Scientific statements

Return a JSON array of detected claims:
[
  {
    "claimText": "The specific claim",
    "claimType": "statistical|health|legal|financial|scientific|factual",
    "confidence": 0.85,
    "shouldVerify": true
  }
]

If no verifiable claims are found, return an empty array: []`;
    
    const result = await generateCompletion(prompt, {
      format: 'json',
      temperature: 0.5
    });
    
    return Array.isArray(result.response) ? result.response : [];
  } catch (error) {
    console.error('Error detecting claims:', error);
    return [];
  }
}

module.exports = {
  factCheckClaim,
  detectClaims,
  buildFactCheckPrompt
};

