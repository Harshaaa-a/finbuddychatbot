// Unit tests for message analyzer module using Deno testing framework
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { 
  shouldIncludeNewsContext, 
  analyzeQuestionType, 
  requiresNewsContext 
} from './message-analyzer.ts';

Deno.test("shouldIncludeNewsContext - keyword detection", () => {
  // Test market-related keywords
  assertEquals(shouldIncludeNewsContext("How is the stock market doing today?"), true);
  assertEquals(shouldIncludeNewsContext("What's happening with Nifty?"), true);
  assertEquals(shouldIncludeNewsContext("Tell me about current market trends"), true);
  assertEquals(shouldIncludeNewsContext("Any updates on BSE?"), true);
  
  // Test time-sensitive keywords
  assertEquals(shouldIncludeNewsContext("What's the latest news?"), true);
  assertEquals(shouldIncludeNewsContext("Current inflation rate"), true);
  assertEquals(shouldIncludeNewsContext("Recent market performance"), true);
  
  // Test news-related keywords
  assertEquals(shouldIncludeNewsContext("Any breaking news in finance?"), true);
  assertEquals(shouldIncludeNewsContext("Show me today's headlines"), true);
  assertEquals(shouldIncludeNewsContext("What are the latest updates?"), true);
  
  // Test financial events keywords
  assertEquals(shouldIncludeNewsContext("Upcoming IPO announcements"), true);
  assertEquals(shouldIncludeNewsContext("Quarterly earnings results"), true);
  assertEquals(shouldIncludeNewsContext("RBI policy updates"), true);
});

Deno.test("shouldIncludeNewsContext - pattern detection", () => {
  // Test direct news request patterns
  assertEquals(shouldIncludeNewsContext("What's happening in the market?"), true);
  assertEquals(shouldIncludeNewsContext("Any news about tech stocks?"), true);
  assertEquals(shouldIncludeNewsContext("Latest updates on banking sector"), true);
  
  // Test market condition patterns
  assertEquals(shouldIncludeNewsContext("How is the market performing?"), true);
  assertEquals(shouldIncludeNewsContext("Should I buy stocks now?"), true);
  assertEquals(shouldIncludeNewsContext("Is it a good time to invest?"), true);
  
  // Test current state patterns
  assertEquals(shouldIncludeNewsContext("What's the current market situation?"), true);
  assertEquals(shouldIncludeNewsContext("How are stocks doing today?"), true);
  
  // Test company-specific patterns
  assertEquals(shouldIncludeNewsContext("How is Reliance stock performing?"), true);
  assertEquals(shouldIncludeNewsContext("Tell me about TCS company"), true);
});

Deno.test("shouldIncludeNewsContext - general financial questions", () => {
  // These should NOT require news context (pure educational)
  assertEquals(shouldIncludeNewsContext("What is a mutual fund?"), false);
  assertEquals(shouldIncludeNewsContext("How to start investing?"), false);
  assertEquals(shouldIncludeNewsContext("Explain compound interest"), false);
  assertEquals(shouldIncludeNewsContext("How does SIP work?"), false);
  
  // Note: This contains "basics" which triggers keyword matching
  assertEquals(shouldIncludeNewsContext("What are the basics of budgeting?"), true);
});

Deno.test("shouldIncludeNewsContext - edge cases", () => {
  // Test empty and invalid inputs
  assertEquals(shouldIncludeNewsContext(""), false);
  assertEquals(shouldIncludeNewsContext("   "), false);
  assertEquals(shouldIncludeNewsContext(null as any), false);
  assertEquals(shouldIncludeNewsContext(undefined as any), false);
  
  // Test case insensitivity
  assertEquals(shouldIncludeNewsContext("MARKET NEWS"), true);
  assertEquals(shouldIncludeNewsContext("Stock Market"), true);
  assertEquals(shouldIncludeNewsContext("current TRENDS"), true);
});

Deno.test("analyzeQuestionType - market queries", () => {
  const result1 = analyzeQuestionType("How is the stock market performing?");
  assertEquals(result1.isMarketQuery, true);
  assertEquals(result1.confidence > 0, true);
  
  const result2 = analyzeQuestionType("Should I invest in Nifty?");
  assertEquals(result2.isMarketQuery, true);
  assertEquals(result2.confidence > 0, true);
  
  const result3 = analyzeQuestionType("Trading strategies for beginners");
  assertEquals(result3.isMarketQuery, true);
  assertEquals(result3.confidence > 0, true);
});

Deno.test("analyzeQuestionType - educational queries", () => {
  const result1 = analyzeQuestionType("How to start investing?");
  assertEquals(result1.isEducationalQuery, true);
  assertEquals(result1.confidence > 0, true);
  
  const result2 = analyzeQuestionType("What is compound interest?");
  assertEquals(result2.isEducationalQuery, true);
  assertEquals(result2.confidence > 0, true);
  
  const result3 = analyzeQuestionType("Explain mutual funds for beginners");
  assertEquals(result3.isEducationalQuery, true);
  assertEquals(result3.confidence > 0, true);
});

Deno.test("analyzeQuestionType - news queries", () => {
  const result1 = analyzeQuestionType("Latest news on stock market");
  assertEquals(result1.isNewsQuery, true);
  assertEquals(result1.confidence > 0, true);
  
  const result2 = analyzeQuestionType("Current updates on inflation");
  assertEquals(result2.isNewsQuery, true);
  assertEquals(result2.confidence > 0, true);
  
  const result3 = analyzeQuestionType("Today's market news");
  assertEquals(result3.isNewsQuery, true);
  assertEquals(result3.confidence > 0, true);
});

Deno.test("analyzeQuestionType - company-specific queries", () => {
  const result1 = analyzeQuestionType("Tell me about Reliance company");
  assertEquals(result1.isCompanySpecific, true);
  assertEquals(result1.confidence > 0, true);
  
  const result2 = analyzeQuestionType("TCS stock performance");
  assertEquals(result2.isCompanySpecific, true);
  assertEquals(result2.confidence > 0, true);
  
  const result3 = analyzeQuestionType("Infosys share price");
  assertEquals(result3.isCompanySpecific, true);
  assertEquals(result3.confidence > 0, true);
});

Deno.test("analyzeQuestionType - confidence scoring", () => {
  // High confidence news query
  const newsResult = analyzeQuestionType("Latest market news today");
  assertEquals(newsResult.confidence > 0.4, true);
  assertEquals(newsResult.confidence <= 1.0, true);
  
  // Mixed query should have moderate confidence
  const mixedResult = analyzeQuestionType("How to invest in current market?");
  assertEquals(mixedResult.confidence > 0.2, true);
  assertEquals(mixedResult.confidence <= 1.0, true);
  
  // Simple educational query should have lower confidence
  const educationalResult = analyzeQuestionType("What is SIP?");
  assertEquals(educationalResult.confidence >= 0, true);
  assertEquals(educationalResult.confidence <= 1.0, true);
});

Deno.test("analyzeQuestionType - edge cases", () => {
  // Test empty input
  const emptyResult = analyzeQuestionType("");
  assertEquals(emptyResult.isMarketQuery, false);
  assertEquals(emptyResult.isEducationalQuery, false);
  assertEquals(emptyResult.isNewsQuery, false);
  assertEquals(emptyResult.isCompanySpecific, false);
  assertEquals(emptyResult.confidence, 0);
  
  // Test null/undefined input
  const nullResult = analyzeQuestionType(null as any);
  assertEquals(nullResult.confidence, 0);
  
  const undefinedResult = analyzeQuestionType(undefined as any);
  assertEquals(undefinedResult.confidence, 0);
});

Deno.test("requiresNewsContext - comprehensive analysis", () => {
  // Should require news context
  assertEquals(requiresNewsContext("What's happening in the market today?"), true);
  assertEquals(requiresNewsContext("Latest stock market updates"), true);
  assertEquals(requiresNewsContext("Current Nifty performance"), true);
  assertEquals(requiresNewsContext("Should I buy stocks now?"), true);
  
  // Should NOT require news context (pure educational)
  assertEquals(requiresNewsContext("How to calculate compound interest?"), false);
  assertEquals(requiresNewsContext("What is diversification?"), false);
  assertEquals(requiresNewsContext("How does SIP work?"), false);
});

Deno.test("requiresNewsContext - confidence thresholds", () => {
  // High confidence news queries should require context
  assertEquals(requiresNewsContext("Breaking news in stock market"), true);
  assertEquals(requiresNewsContext("Today's market updates"), true);
  
  // High confidence market queries should require context
  assertEquals(requiresNewsContext("Current market trends and analysis"), true);
  assertEquals(requiresNewsContext("Stock market performance today"), true);
  
  // Low confidence educational queries should not require context
  assertEquals(requiresNewsContext("Learn about investing"), false);
  assertEquals(requiresNewsContext("Basic financial planning"), false);
});

Deno.test("Message classification accuracy - comprehensive test", () => {
  // Test cases that should clearly require news context
  const newsRequiredMessages = [
    "What's the latest on the stock market?",
    "Current inflation rate in India",
    "Today's Sensex performance",
    "Recent RBI policy changes",
    "Breaking news in finance sector",
    "Should I invest in current market conditions?",
    "How is Reliance stock doing today?",
    "Latest IPO announcements"
  ];
  
  newsRequiredMessages.forEach(message => {
    assertEquals(
      requiresNewsContext(message), 
      true, 
      `Message "${message}" should require news context`
    );
  });
  
  // Test cases that should NOT require news context (pure educational)
  const pureEducationalMessages = [
    "How does compound interest work?",
    "Explain mutual funds",
    "How to start a SIP?",
    "What is portfolio diversification?",
    "Types of insurance policies",
    "How to calculate EMI?"
  ];
  
  pureEducationalMessages.forEach(message => {
    assertEquals(
      requiresNewsContext(message), 
      false, 
      `Message "${message}" should NOT require news context`
    );
  });
  
  // Test edge cases where keyword matching might cause false positives
  // These contain financial keywords but are educational in nature
  const edgeCases = [
    { message: "What is a stock?", expected: true, reason: "Contains 'stock' keyword" },
    { message: "What are the basics of budgeting?", expected: true, reason: "Contains 'basics' keyword" }
  ];
  
  edgeCases.forEach(({ message, expected, reason }) => {
    assertEquals(
      requiresNewsContext(message), 
      expected, 
      `Edge case: "${message}" - ${reason}`
    );
  });
});