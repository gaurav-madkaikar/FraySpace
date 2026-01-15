const axios = require('axios');

/**
 * Search the web for information
 * Uses DuckDuckGo by default, or SerpAPI if configured
 */

/**
 * Search using DuckDuckGo HTML scraping (free, no API key)
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Search results
 */
async function searchDuckDuckGo(query, limit = 10) {
  try {
    // DuckDuckGo Instant Answer API (limited but free)
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1
      },
      timeout: 10000
    });
    
    const results = [];
    
    // Add abstract if available
    if (response.data.Abstract) {
      results.push({
        title: response.data.Heading || 'DuckDuckGo Result',
        url: response.data.AbstractURL,
        snippet: response.data.Abstract,
        source: 'DuckDuckGo'
      });
    }
    
    // Add related topics
    if (response.data.RelatedTopics) {
      response.data.RelatedTopics.slice(0, limit - 1).forEach(topic => {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo'
          });
        }
      });
    }
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('DuckDuckGo search error:', error.message);
    return [];
  }
}

/**
 * Search using SerpAPI (requires API key, more comprehensive)
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Search results
 */
async function searchWithSerpAPI(query, limit = 10) {
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    throw new Error('SERPAPI_KEY not configured');
  }
  
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        api_key: apiKey,
        num: limit,
        engine: 'google'
      },
      timeout: 10000
    });
    
    const results = [];
    
    if (response.data.organic_results) {
      response.data.organic_results.forEach(result => {
        results.push({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          source: 'Google (SerpAPI)'
        });
      });
    }
    
    return results;
  } catch (error) {
    console.error('SerpAPI search error:', error.message);
    throw error;
  }
}

/**
 * Main search function - tries SerpAPI first, falls back to DuckDuckGo
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Search results
 */
async function searchWeb(query, limit = 10) {
  try {
    // Try SerpAPI if key is available
    if (process.env.SERPAPI_KEY) {
      try {
        return await searchWithSerpAPI(query, limit);
      } catch (error) {
        console.log('SerpAPI failed, falling back to DuckDuckGo');
      }
    }
    
    // Fall back to DuckDuckGo
    return await searchDuckDuckGo(query, limit);
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

/**
 * Search for fact-checking specific sources
 * @param {string} claim - Claim to fact-check
 * @returns {Promise<Array>} - Search results from fact-checking sites
 */
async function searchFactCheckSources(claim) {
  const factCheckSites = [
    'snopes.com',
    'factcheck.org',
    'politifact.com',
    'reuters.com/fact-check',
    'apnews.com/ap-fact-check'
  ];
  
  const query = `${claim} site:${factCheckSites.join(' OR site:')}`;
  
  return await searchWeb(query, 5);
}

/**
 * Extract credibility score based on source domain
 * @param {string} url - URL to evaluate
 * @returns {number} - Credibility score (0-1)
 */
function getSourceCredibility(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // High credibility sources
    const highCredibility = [
      'gov', 'edu', 'who.int', 'cdc.gov', 'nih.gov',
      'nature.com', 'science.org', 'sciencemag.org',
      'reuters.com', 'apnews.com', 'bbc.com',
      'snopes.com', 'factcheck.org', 'politifact.com'
    ];
    
    // Medium credibility sources
    const mediumCredibility = [
      'wikipedia.org', 'britannica.com',
      'nytimes.com', 'washingtonpost.com', 'wsj.com',
      'theguardian.com', 'economist.com'
    ];
    
    // Check if domain matches high credibility
    if (highCredibility.some(trusted => domain.includes(trusted))) {
      return 0.9;
    }
    
    // Check if domain matches medium credibility
    if (mediumCredibility.some(med => domain.includes(med))) {
      return 0.7;
    }
    
    // Check for .gov or .edu domains
    if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
      return 0.85;
    }
    
    // Default credibility
    return 0.5;
  } catch (error) {
    return 0.5;
  }
}

/**
 * Enhance search results with credibility scores
 * @param {Array} results - Search results
 * @returns {Array} - Enhanced results with credibility scores
 */
function enhanceResultsWithCredibility(results) {
  return results.map(result => ({
    ...result,
    credibilityScore: getSourceCredibility(result.url)
  })).sort((a, b) => b.credibilityScore - a.credibilityScore);
}

module.exports = {
  searchWeb,
  searchDuckDuckGo,
  searchWithSerpAPI,
  searchFactCheckSources,
  getSourceCredibility,
  enhanceResultsWithCredibility
};

