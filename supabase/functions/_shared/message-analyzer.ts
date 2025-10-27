// Message analyzer module for determining news relevance in user queries

import { QuestionAnalysis } from './types.ts';

/**
 * Keywords that indicate a user query might need current news context
 */
const NEWS_RELEVANT_KEYWORDS = [
  // Market-related terms
  'market', 'markets', 'stock', 'stocks', 'share', 'shares', 'equity', 'equities',
  'nifty', 'sensex', 'bse', 'nse', 'index', 'indices',
  
  // Time-sensitive terms
  'current', 'today', 'now', 'recent', 'latest', 'new', 'breaking',
  'this week', 'this month', 'yesterday', 'tomorrow',
  
  // News-related terms
  'news', 'update', 'updates', 'announcement', 'report', 'reports',
  'headline', 'headlines', 'happening', 'event', 'events',
  
  // Financial events
  'earnings', 'results', 'quarterly', 'ipo', 'merger', 'acquisition',
  'dividend', 'split', 'bonus', 'rights issue',
  
  // Economic indicators
  'inflation', 'gdp', 'interest rate', 'repo rate', 'policy',
  'budget', 'rbi', 'sebi', 'government',
  
  // Company-specific
  'company', 'companies', 'corporate', 'business', 'industry',
  'sector', 'performance', 'growth', 'decline', 'rise', 'fall'
];

/**
 * Question patterns that typically require current context
 */
const NEWS_RELEVANT_PATTERNS = [
  // Direct news requests
  /what.*happening/i,
  /what.*news/i,
  /any.*update/i,
  /latest.*on/i,
  
  // Market condition queries
  /how.*market/i,
  /market.*doing/i,
  /stock.*performing/i,
  /should.*buy/i,
  /should.*sell/i,
  /good.*time.*invest/i,
  
  // Current state questions
  /what.*current/i,
  /how.*today/i,
  /right.*now/i,
  /at.*moment/i,
  
  // Specific company queries
  /how.*\w+.*stock/i,
  /\w+.*share.*price/i,
  /tell.*about.*\w+.*company/i
];

/**
 * Analyzes a user message to determine if it requires current news context
 * @param message - The user's message to analyze
 * @returns boolean indicating whether news context should be included
 */
export function shouldIncludeNewsContext(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const normalizedMessage = message.toLowerCase().trim();
  
  // Check for direct keyword matches
  const hasRelevantKeywords = NEWS_RELEVANT_KEYWORDS.some(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  // Check for pattern matches
  const hasRelevantPatterns = NEWS_RELEVANT_PATTERNS.some(pattern => 
    pattern.test(normalizedMessage)
  );
  
  return hasRelevantKeywords || hasRelevantPatterns;
}

/**
 * Analyzes the type of financial question being asked
 * @param message - The user's message to analyze
 * @returns object with question type analysis
 */
export function analyzeQuestionType(message: string): QuestionAnalysis {
  if (!message || typeof message !== 'string') {
    return {
      isMarketQuery: false,
      isEducationalQuery: false,
      isNewsQuery: false,
      isCompanySpecific: false,
      confidence: 0
    };
  }

  const normalizedMessage = message.toLowerCase().trim();
  let confidence = 0;
  
  // Market-related query detection
  const marketKeywords = ['market', 'stock', 'share', 'nifty', 'sensex', 'trading', 'investment'];
  const isMarketQuery = marketKeywords.some(keyword => {
    if (normalizedMessage.includes(keyword)) {
      confidence += 0.2;
      return true;
    }
    return false;
  });
  
  // Educational query detection
  const educationalKeywords = ['how to', 'what is', 'explain', 'learn', 'understand', 'basics', 'beginner'];
  const isEducationalQuery = educationalKeywords.some(keyword => {
    if (normalizedMessage.includes(keyword)) {
      confidence += 0.15;
      return true;
    }
    return false;
  });
  
  // News query detection
  const newsKeywords = ['news', 'update', 'latest', 'current', 'today', 'recent'];
  const isNewsQuery = newsKeywords.some(keyword => {
    if (normalizedMessage.includes(keyword)) {
      confidence += 0.25;
      return true;
    }
    return false;
  });
  
  // Company-specific query detection
  const companyPatterns = [
    /tell.*about.*\w+/i,
    /\w+.*company/i,
    /\w+.*stock/i,
    /\w+.*share/i
  ];
  const isCompanySpecific = companyPatterns.some(pattern => {
    if (pattern.test(normalizedMessage)) {
      confidence += 0.2;
      return true;
    }
    return false;
  });
  
  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    isMarketQuery,
    isEducationalQuery,
    isNewsQuery,
    isCompanySpecific,
    confidence
  };
}

/**
 * Main function to determine if news context should be included
 * Combines keyword detection and question type analysis
 * @param message - The user's message to analyze
 * @returns boolean indicating whether to include news context
 */
export function requiresNewsContext(message: string): boolean {
  const shouldInclude = shouldIncludeNewsContext(message);
  const questionAnalysis = analyzeQuestionType(message);
  
  // Include news if:
  // 1. Basic keyword/pattern analysis suggests it
  // 2. It's a news query with high confidence
  // 3. It's a market query with medium+ confidence
  return shouldInclude || 
         (questionAnalysis.isNewsQuery && questionAnalysis.confidence > 0.3) ||
         (questionAnalysis.isMarketQuery && questionAnalysis.confidence > 0.4);
}