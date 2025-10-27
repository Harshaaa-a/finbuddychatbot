# Implementation Plan

- [x] 1. Set up project structure and configuration
  - Create directory structure for Supabase Edge Functions
  - Set up TypeScript configuration and dependencies
  - Create environment variable templates and configuration files
  - _Requirements: 5.1, 5.2, 6.2_

- [x] 2. Implement database schema and Supabase client
  - [x] 2.1 Create database migration for latest_news table
    - Write SQL migration file with table schema and indexes
    - Include proper data types and constraints for news storage
    - _Requirements: 3.3, 5.3_
  
  - [x] 2.2 Implement Supabase client module
    - Create centralized Supabase client with connection handling
    - Implement database operation functions for news CRUD operations
    - Add error handling and connection retry logic
    - _Requirements: 5.3, 5.4_

- [x] 3. Implement message analysis and news relevance detection
  - [x] 3.1 Create message analyzer module
    - Implement keyword detection logic for news-relevant queries
    - Add question type analysis to determine context needs
    - Create function to return boolean for news inclusion decision
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Write unit tests for message analyzer
    - Test keyword detection accuracy with various input messages
    - Verify correct classification of news-relevant vs general questions
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Implement AI response generation system
  - [x] 4.1 Create HuggingFace API integration module
    - Implement API client for HuggingFace text generation
    - Add model configuration for Llama-3.1-8B-Instruct and Gemma-7b-it
    - Include error handling and fallback model logic
    - _Requirements: 4.1, 2.4, 2.5_

  - [x] 4.2 Implement system prompt construction
    - Create FinBuddy personality prompt template
    - Add conditional news context injection based on message analysis
    - Implement prompt formatting and token limit management
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 4.3 Write unit tests for AI integration
    - Test prompt construction with and without news context
    - Mock HuggingFace API responses for testing
    - _Requirements: 2.4, 2.5_

- [x] 5. Implement chat API endpoint
  - [x] 5.1 Create main chat endpoint handler
    - Implement POST /chat route with JSON request/response handling
    - Add CORS configuration for frontend integration
    - Integrate message analyzer and AI response generator
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 Add request validation and error handling
    - Implement input validation for message field
    - Add comprehensive error responses with appropriate HTTP status codes
    - Include rate limiting and timeout handling
    - _Requirements: 1.5, 6.4_

  - [x] 5.3 Write integration tests for chat endpoint
    - Test complete chat flow with mock dependencies
    - Verify CORS headers and error response formats
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Implement news fetching system
  - [x] 6.1 Create external news API integration
    - Implement NewsData.io or Finnhub.io API client
    - Add filtering for Indian financial and business news
    - Include error handling and rate limit management
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 6.2 Implement news storage and cleanup logic
    - Create function to update latest_news table with new headlines
    - Add cleanup logic to maintain only latest 10 news items
    - Implement duplicate detection and prevention
    - _Requirements: 3.3, 3.5_

  - [x] 6.3 Create scheduled news fetcher function
    - Implement /fetchNews Edge Function for Supabase cron
    - Integrate news API client and storage logic
    - Add comprehensive error handling and logging
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 6.4 Write unit tests for news fetching
    - Test news API integration with mock responses
    - Verify database update and cleanup operations
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Create deployment configuration and documentation
  - [x] 7.1 Set up Supabase Edge Functions deployment files
    - Create function configuration files for chat and fetchNews
    - Add Supabase CLI deployment scripts
    - Configure cron job for automated news fetching
    - _Requirements: 6.1, 6.2, 3.1_

  - [x] 7.2 Create comprehensive README documentation
    - Write setup instructions for environment variables
    - Add deployment guide for Supabase Edge Functions
    - Include example API calls using curl and fetch
    - Document free tier limitations and usage guidelines
    - _Requirements: 5.5, 6.3, 6.4, 6.5_

  - [x] 7.3 Create example integration code
    - Write sample frontend integration code
    - Add example error handling for different scenarios
    - _Requirements: 6.4, 6.5_

- [-] 8. Final integration and testing
  - [x] 8.1 Integrate all modules and test complete system
    - Connect chat endpoint with all supporting modules
    - Verify news fetching and chat functionality work together
    - Test deployment configuration and environment setup
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

  - [x] 8.2 Perform end-to-end testing
    - Test complete user journey from message to AI response
    - Verify news updates are reflected in chat responses
    - Test error scenarios and recovery mechanisms
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_