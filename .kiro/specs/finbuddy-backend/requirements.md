# Requirements Document

## Introduction

FinBuddy Backend is a complete free backend system for an AI finance chatbot that helps users learn about investing, personal finance, and current financial news in India. The system provides chat functionality powered by free AI models and automated news fetching capabilities, designed to be deployed on Supabase Edge Functions.

## Glossary

- **FinBuddy_Backend**: The complete backend system including API endpoints and scheduled functions
- **Chat_Endpoint**: The main API endpoint that processes user messages and returns AI responses
- **News_Fetcher**: The scheduled function that retrieves and stores financial news headlines
- **Supabase_Client**: The database client for reading and writing data to Supabase
- **HuggingFace_API**: The free text generation API service used for AI responses
- **News_API**: External service providing financial news headlines (NewsData.io or Finnhub.io)
- **Latest_News_Table**: Supabase database table storing the most recent financial news headlines
- **System_Prompt**: The predefined personality and behavior instructions for FinBuddy

## Requirements

### Requirement 1

**User Story:** As a frontend developer, I want to send user messages to a chat API endpoint, so that I can get AI-powered financial advice responses for my users.

#### Acceptance Criteria

1. WHEN a POST request is sent to /chat endpoint with JSON body containing "message" field, THE FinBuddy_Backend SHALL return a JSON response with AI-generated financial advice
2. THE Chat_Endpoint SHALL accept requests with Content-Type application/json
3. THE Chat_Endpoint SHALL enable CORS headers to allow frontend website integration
4. THE Chat_Endpoint SHALL return responses in format {"success": true, "message": "response text"}
5. IF the request body is malformed or missing message field, THEN THE Chat_Endpoint SHALL return error response with appropriate HTTP status code

### Requirement 2

**User Story:** As a user of FinBuddy, I want the chatbot to have access to current financial news, so that I can get advice based on the latest market information.

#### Acceptance Criteria

1. WHEN user questions require current market context or news-related information, THE FinBuddy_Backend SHALL retrieve the latest 3 financial news headlines from Latest_News_Table
2. WHEN user questions are about general financial literacy or investing concepts, THE FinBuddy_Backend SHALL respond using educational content without including news headlines
3. THE FinBuddy_Backend SHALL analyze user message content to determine if current news context is relevant before including headlines
4. THE System_Prompt SHALL define FinBuddy as a friendly, trustworthy Indian AI financial assistant for young investors
5. THE FinBuddy_Backend SHALL use educational context and examples rather than personal financial recommendations
6. THE FinBuddy_Backend SHALL maintain conversational, positive, and responsible tone in all responses

### Requirement 3

**User Story:** As a system administrator, I want financial news to be automatically updated, so that users always receive advice based on current market information.

#### Acceptance Criteria

1. THE News_Fetcher SHALL execute automatically every 6 hours
2. WHEN News_Fetcher runs, THE FinBuddy_Backend SHALL fetch latest financial and business headlines from News_API
3. THE News_Fetcher SHALL update Latest_News_Table with new headlines using Supabase_Client
4. THE News_Fetcher SHALL focus on Indian financial and business news when available
5. THE News_Fetcher SHALL handle API rate limits and errors gracefully without system failure

### Requirement 4

**User Story:** As a developer, I want the backend to use free services only, so that I can deploy and run the system without ongoing costs.

#### Acceptance Criteria

1. THE FinBuddy_Backend SHALL use free HuggingFace_API models such as meta-llama/Llama-3.1-8B-Instruct or google/gemma-7b-it
2. THE FinBuddy_Backend SHALL use free News_API services like NewsData.io or Finnhub.io free tier
3. THE FinBuddy_Backend SHALL be compatible with Supabase Edge Functions free tier deployment
4. THE FinBuddy_Backend SHALL use Supabase free tier for database operations
5. THE FinBuddy_Backend SHALL not require any paid external services or premium API keys

### Requirement 5

**User Story:** As a developer, I want the backend to be modular and well-organized, so that I can easily maintain and extend the system.

#### Acceptance Criteria

1. THE FinBuddy_Backend SHALL organize code into separate modules for chat handling, news fetching, database operations, and AI integration
2. THE FinBuddy_Backend SHALL use environment variables for all API keys and configuration values
3. THE FinBuddy_Backend SHALL include Supabase_Client module for all database operations
4. THE FinBuddy_Backend SHALL separate AI response generation logic into dedicated module
5. THE FinBuddy_Backend SHALL include comprehensive README.md with setup and deployment instructions

### Requirement 6

**User Story:** As a developer, I want to easily deploy the backend to production, so that I can make the FinBuddy service available to users.

#### Acceptance Criteria

1. THE FinBuddy_Backend SHALL be built with Node.js and TypeScript for Supabase Edge Functions compatibility
2. THE FinBuddy_Backend SHALL include deployment configuration for both chat and news fetching functions
3. THE FinBuddy_Backend SHALL provide clear documentation for environment variable setup
4. THE FinBuddy_Backend SHALL include example API calls using curl or fetch
5. THE FinBuddy_Backend SHALL be ready for immediate deployment without additional configuration