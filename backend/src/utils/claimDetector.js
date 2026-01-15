/**
 * Utility for detecting factual claims in text
 */

/**
 * Detect potential factual claims in text using pattern matching
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of detected claims
 */
function detectClaimsInText(text) {
  const claims = [];
  
  // Pattern 1: Statistical claims
  const statPatterns = [
    /(\d+(?:\.\d+)?%\s+of\s+[^.!?]+)/gi,
    /(\d+\s+(?:out of|in)\s+\d+\s+[^.!?]+)/gi,
    /(?:according to|research shows?|studies? (?:show|prove|suggest))[^.!?]+/gi
  ];
  
  statPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        claims.push({
          claimText: match.trim(),
          claimType: 'statistical',
          confidence: 0.8,
          shouldVerify: true,
          startIndex: text.indexOf(match),
          endIndex: text.indexOf(match) + match.length
        });
      });
    }
  });
  
  // Pattern 2: Health claims
  const healthKeywords = [
    'cures?', 'treats?', 'prevents?', 'causes?', 'heals?',
    'cancer', 'diabetes', 'disease', 'illness', 'symptom',
    'medicine', 'drug', 'therapy', 'treatment'
  ];
  
  const healthPattern = new RegExp(
    `((?:${healthKeywords.join('|')})\\s+[^.!?]+)`,
    'gi'
  );
  
  const healthMatches = text.match(healthPattern);
  if (healthMatches) {
    healthMatches.forEach(match => {
      if (match.length > 20) { // Avoid matching single words
        claims.push({
          claimText: match.trim(),
          claimType: 'health',
          confidence: 0.85,
          shouldVerify: true,
          startIndex: text.indexOf(match),
          endIndex: text.indexOf(match) + match.length
        });
      }
    });
  }
  
  // Pattern 3: Legal/Financial claims
  const legalFinancialKeywords = [
    'illegal', 'unlawful', 'law requires?', 'legal',
    'guaranteed', 'return', 'profit', 'investment'
  ];
  
  const legalFinancialPattern = new RegExp(
    `((?:${legalFinancialKeywords.join('|')})\\s+[^.!?]+)`,
    'gi'
  );
  
  const legalMatches = text.match(legalFinancialPattern);
  if (legalMatches) {
    legalMatches.forEach(match => {
      if (match.length > 20) {
        const type = /illegal|unlawful|law|legal/i.test(match) ? 'legal' : 'financial';
        claims.push({
          claimText: match.trim(),
          claimType: type,
          confidence: 0.8,
          shouldVerify: true,
          startIndex: text.indexOf(match),
          endIndex: text.indexOf(match) + match.length
        });
      }
    });
  }
  
  // Pattern 4: Definitive statements
  const definitivePattern = /(?:always|never|every|all|none|no)\s+(?:causes?|results? in|leads? to|means?)[^.!?]+/gi;
  const definitiveMatches = text.match(definitivePattern);
  
  if (definitiveMatches) {
    definitiveMatches.forEach(match => {
      claims.push({
        claimText: match.trim(),
        claimType: 'factual',
        confidence: 0.7,
        shouldVerify: true,
        startIndex: text.indexOf(match),
        endIndex: text.indexOf(match) + match.length
      });
    });
  }
  
  // Remove duplicates
  const uniqueClaims = [];
  const seenTexts = new Set();
  
  claims.forEach(claim => {
    if (!seenTexts.has(claim.claimText.toLowerCase())) {
      seenTexts.add(claim.claimText.toLowerCase());
      uniqueClaims.push(claim);
    }
  });
  
  return uniqueClaims;
}

/**
 * Check if text contains high-impact claims
 */
function hasHighImpactClaim(text) {
  const highImpactPatterns = [
    /(?:cures?|treats?|prevents?) (?:cancer|diabetes|covid|disease)/i,
    /\d+%\s+of\s+(?:people|Americans|users) (?:die|suffer|experience)/i,
    /(?:guaranteed|proven to|scientifically proven)/i,
    /(?:illegal|unlawful|banned by law)/i
  ];
  
  return highImpactPatterns.some(pattern => pattern.test(text));
}

/**
 * Extract claims that need fact-checking based on confidence threshold
 */
function getVerifiableClaims(text, minConfidence = 0.7) {
  const claims = detectClaimsInText(text);
  return claims.filter(claim => 
    claim.shouldVerify && claim.confidence >= minConfidence
  );
}

/**
 * Score claim importance for prioritization
 */
function scoreClaimImportance(claim) {
  let score = claim.confidence;
  
  // Increase score for specific claim types
  const typeScores = {
    health: 1.5,
    legal: 1.4,
    financial: 1.3,
    statistical: 1.2,
    scientific: 1.2,
    factual: 1.0,
    other: 0.8
  };
  
  score *= (typeScores[claim.claimType] || 1.0);
  
  // Increase score for longer, more specific claims
  if (claim.claimText.length > 100) {
    score *= 1.1;
  }
  
  return Math.min(score, 1.0);
}

module.exports = {
  detectClaimsInText,
  hasHighImpactClaim,
  getVerifiableClaims,
  scoreClaimImportance
};

