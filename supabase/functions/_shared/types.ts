// Shared TypeScript types for the FinBuddy backend

export interface NewsItem {
  id: number;
  headline: string;
  url?: string;
  published_at: string;
  source: string;
  created_at: string;
}

export interface NewsInsert {
  headline: string;
  url?: string;
  published_at?: string;
  source: string;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface AIContext {
  systemPrompt: string;
  userMessage: string;
  newsContext?: string;
}

export interface QuestionAnalysis {
  isMarketQuery: boolean;
  isEducationalQuery: boolean;
  isNewsQuery: boolean;
  isCompanySpecific: boolean;
  confidence: number;
}

export interface TokenUsage {
  systemPromptTokens: number;
  userMessageTokens: number;
  totalTokens: number;
  withinLimit: boolean;
}

export interface MessageValidation {
  isValid: boolean;
  error?: string;
}