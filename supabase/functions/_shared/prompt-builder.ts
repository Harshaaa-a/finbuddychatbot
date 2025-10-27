// System prompt construction module for FinBuddy AI responses

import { CONFIG } from './config.ts';
import { NewsItem, AIContext, TokenUsage, MessageValidation } from './types.ts';
import { requiresNewsContext } from './message-analyzer.ts';

/**
 * Maximum token limit for the complete prompt (including system + context + user message)
 * Leaving room for the AI response within model limits
 */
const MAX_PROMPT_TOKENS = 2000;

/**
 * Estimated tokens per character (rough approximation for token management)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Build complete AI context with system prompt and optional news context
 * @param userMessage - The user's message
 * @param newsItems - Latest news items (optional)
 * @returns AIContext object ready for AI generation
 */
export function buildAIContext(userMessage: string, newsItems?: NewsItem[]): AIContext {
  const needsNewsContext = requiresNewsContext(userMessage);
  
  let systemPrompt = CONFIG.SYSTEM_PROMPT;
  let newsContext: string | undefined;
  
  if (needsNewsContext && newsItems && newsItems.length > 0) {
    newsContext = formatNewsContext(newsItems);
    systemPrompt = buildSystemPromptWithNews(newsContext);
  }
  
  // Ensure prompt doesn't exceed token limits
  const finalPrompt = ensureTokenLimit(systemPrompt, userMessage);
  
  return {
    systemPrompt: finalPrompt,
    userMessage: userMessage.trim(),
    newsContext
  };
}

/**
 * Format news items into a readable context string
 * @param newsItems - Array of news items to format
 * @returns Formatted news context string
 */
function formatNewsContext(newsItems: NewsItem[]): string {
  if (!newsItems || newsItems.length === 0) {
    return '';
  }
  
  // Take only the latest 3 news items to keep context concise
  const latestNews = newsItems.slice(0, 3);
  
  const formattedNews = latestNews.map((item, index) => {
    const headline = item.headline.trim();
    const source = item.source ? ` (${item.source})` : '';
    return `${index + 1}. ${headline}${source}`;
  }).join('\n');
  
  return formattedNews;
}

/**
 * Build system prompt with news context included
 * @param newsContext - Formatted news context string
 * @returns Complete system prompt with news context
 */
function buildSystemPromptWithNews(newsContext: string): string {
  return `${CONFIG.SYSTEM_PROMPT}

CURRENT FINANCIAL NEWS CONTEXT:
${newsContext}

Use this news context only when relevant to the user's question. Don't force news references if the question is about general financial concepts.`;
}

/**
 * Ensure the complete prompt stays within token limits
 * @param systemPrompt - The system prompt
 * @param userMessage - The user's message
 * @returns Truncated system prompt if necessary
 */
function ensureTokenLimit(systemPrompt: string, userMessage: string): string {
  const userMessageTokens = estimateTokens(userMessage);
  const availableTokensForSystem = MAX_PROMPT_TOKENS - userMessageTokens - 100; // Buffer for formatting
  
  if (availableTokensForSystem <= 0) {
    throw new Error('User message is too long');
  }
  
  const systemPromptTokens = estimateTokens(systemPrompt);
  
  if (systemPromptTokens <= availableTokensForSystem) {
    return systemPrompt;
  }
  
  // Truncate system prompt if it's too long
  const maxChars = availableTokensForSystem * CHARS_PER_TOKEN;
  const truncatedPrompt = systemPrompt.substring(0, maxChars);
  
  // Try to cut at a sentence boundary
  const lastSentenceEnd = Math.max(
    truncatedPrompt.lastIndexOf('.'),
    truncatedPrompt.lastIndexOf('!'),
    truncatedPrompt.lastIndexOf('?')
  );
  
  if (lastSentenceEnd > maxChars * 0.8) {
    return truncatedPrompt.substring(0, lastSentenceEnd + 1);
  }
  
  return truncatedPrompt + '...';
}

/**
 * Estimate token count for a given text
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Format the complete prompt for the AI model
 * @param context - AI context object
 * @returns Formatted prompt string ready for AI generation
 */
export function formatPromptForModel(context: AIContext): string {
  return `${context.systemPrompt}

User Question: ${context.userMessage}

FinBuddy Response:`;
}

/**
 * Validate user message before processing
 * @param message - User message to validate
 * @returns MessageValidation object indicating if message is valid
 */
export function validateUserMessage(message: string): MessageValidation {
  if (!message || typeof message !== 'string') {
    return { isValid: false, error: 'Message is required and must be a string' };
  }
  
  const trimmedMessage = message.trim();
  
  if (trimmedMessage.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (trimmedMessage.length > 1000) {
    return { isValid: false, error: 'Message is too long (maximum 1000 characters)' };
  }
  
  // Check for potentially harmful content patterns
  const harmfulPatterns = [
    /system\s*:/i,
    /assistant\s*:/i,
    /ignore\s+previous/i,
    /forget\s+instructions/i
  ];
  
  const hasHarmfulContent = harmfulPatterns.some(pattern => pattern.test(trimmedMessage));
  if (hasHarmfulContent) {
    return { isValid: false, error: 'Message contains invalid content' };
  }
  
  return { isValid: true };
}

/**
 * Clean and sanitize AI response
 * @param response - Raw AI response
 * @returns Cleaned response
 */
export function cleanAIResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return 'I apologize, but I encountered an issue generating a response. Please try again.';
  }
  
  let cleaned = response.trim();
  
  // Remove any system prompt leakage
  cleaned = cleaned.replace(/^(System|Assistant|FinBuddy Response):\s*/i, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Ensure response isn't too long
  if (cleaned.length > 1500) {
    const truncateAt = cleaned.lastIndexOf('.', 1400);
    if (truncateAt > 1000) {
      cleaned = cleaned.substring(0, truncateAt + 1);
    } else {
      cleaned = cleaned.substring(0, 1400) + '...';
    }
  }
  
  // Ensure response ends properly
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned || 'I apologize, but I encountered an issue generating a response. Please try again.';
}

/**
 * Get token usage statistics for monitoring
 * @param context - AI context object
 * @returns Token usage information
 */
export function getTokenUsage(context: AIContext): TokenUsage {
  const systemPromptTokens = estimateTokens(context.systemPrompt);
  const userMessageTokens = estimateTokens(context.userMessage);
  const totalTokens = systemPromptTokens + userMessageTokens;
  
  return {
    systemPromptTokens,
    userMessageTokens,
    totalTokens,
    withinLimit: totalTokens <= MAX_PROMPT_TOKENS
  };
}