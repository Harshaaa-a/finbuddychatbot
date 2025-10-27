// AI response generator that combines HuggingFace API and prompt construction

import { createHuggingFaceClient, HuggingFaceClient } from './huggingface-client.ts';
import { 
  buildAIContext, 
  formatPromptForModel, 
  validateUserMessage, 
  cleanAIResponse,
  getTokenUsage 
} from './prompt-builder.ts';
import { NewsItem, ChatResponse } from './types.ts';

/**
 * AI Response Generator class that handles the complete flow from user message to AI response
 */
export class AIResponseGenerator {
  private huggingFaceClient: HuggingFaceClient;

  constructor() {
    this.huggingFaceClient = createHuggingFaceClient();
  }

  /**
   * Generate AI response for user message with optional news context
   * @param userMessage - The user's message
   * @param newsItems - Optional latest news items for context
   * @returns Promise<ChatResponse> - Complete chat response
   */
  async generateResponse(userMessage: string, newsItems?: NewsItem[]): Promise<ChatResponse> {
    try {
      // Validate user message
      const validation = validateUserMessage(userMessage);
      if (!validation.isValid) {
        return {
          success: false,
          message: '',
          error: validation.error
        };
      }

      // Build AI context with system prompt and news context
      const aiContext = buildAIContext(userMessage, newsItems);
      
      // Check token usage
      const tokenUsage = getTokenUsage(aiContext);
      if (!tokenUsage.withinLimit) {
        console.warn('Token usage exceeds limit:', tokenUsage);
      }

      // Format prompt for the model
      const formattedPrompt = formatPromptForModel(aiContext);

      // Generate response using HuggingFace API
      const rawResponse = await this.huggingFaceClient.generateText(formattedPrompt);

      // Clean and format the response
      const cleanedResponse = cleanAIResponse(rawResponse);

      return {
        success: true,
        message: cleanedResponse
      };

    } catch (error) {
      console.error('AI response generation failed:', error);
      
      // Return user-friendly error message
      const errorMessage = this.getErrorMessage(error);
      return {
        success: false,
        message: '',
        error: errorMessage
      };
    }
  }

  /**
   * Test the AI response generator
   * @returns Promise<boolean> - Whether the test was successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.generateResponse('Hello, can you help me with investing?');
      return testResponse.success;
    } catch (error) {
      console.error('AI response generator test failed:', error);
      return false;
    }
  }

  /**
   * Get user-friendly error message from error object
   * @param error - The error object
   * @returns User-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      const message = error.message.toLowerCase();
      
      if (message.includes('timeout')) {
        return 'The AI service is taking too long to respond. Please try again.';
      }
      
      if (message.includes('rate limit') || message.includes('quota')) {
        return 'The AI service is currently busy. Please try again in a few minutes.';
      }
      
      if (message.includes('unavailable') || message.includes('service')) {
        return 'The AI service is temporarily unavailable. Please try again later.';
      }
      
      if (message.includes('api key') || message.includes('authentication')) {
        return 'There is a configuration issue with the AI service. Please contact support.';
      }
    }

    return 'I encountered an unexpected error. Please try again, and if the problem persists, contact support.';
  }
}

/**
 * Create AI response generator instance
 * @returns AIResponseGenerator instance
 */
export function createAIResponseGenerator(): AIResponseGenerator {
  return new AIResponseGenerator();
}

/**
 * Quick utility function to generate a response (for simple use cases)
 * @param userMessage - The user's message
 * @param newsItems - Optional news items for context
 * @returns Promise<ChatResponse> - Complete chat response
 */
export async function generateAIResponse(userMessage: string, newsItems?: NewsItem[]): Promise<ChatResponse> {
  const generator = createAIResponseGenerator();
  return await generator.generateResponse(userMessage, newsItems);
}