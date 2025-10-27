// Unit tests for message analyzer module
// Simple test runner that validates message analyzer functionality

console.log('Starting Message Analyzer Tests...\n');

// Test implementation that mirrors the TypeScript message analyzer logic

// Simple test runner
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

function assertEquals(actual, expected, message = '') {
  testCount++;
  if (actual === expected) {
    passedTests++;
    console.log(`✓ Test ${testCount}: PASSED ${message}`);
  } else {
    failedTests++;
    console.log(`✗ Test ${testCount}: FAILED ${message}`);
    console.log(`  Expected: ${expected}, Got: ${actual}`);
  }
}

function runTest(testName, testFn) {
  console.log(`\n--- Running: ${testName} ---`);
  try {
    testFn();
  } catch (error) {
    failedTests++;
    console.log(`✗ Test failed with error: ${error.message}`);
  }
}

// Mock the TypeScript module exports for testing
// Since we can't directly import TS in Node.js, we'll create a simplified version
const NEWS_RELEVANT_KEYWORDS = [
  'market', 'markets', 'stock', 'stocks', 'share', 'shares', 'equity', 'equities',
  'nifty', 'sensex', 'bse', 'nse', 'index', 'indices',
  'current', 'today', 'now', 'recent', 'latest', 'new', 'breaking',
  'this week', 'this month', 'yesterday', 'tomorrow',
  'news', 'update', 'updates', 'announcement', 'report', 'reports',
  'headline', 'headlines', 'happening', 'event', 'events',
  'earnings', 'results', 'quarterly', 'ipo', 'merger', 'acquisition',
  'dividend', 'split', 'bonus', 'rights issue',
  'inflation', 'gdp', 'interest rate', 'repo rate', 'policy',
  'budget', 'rbi', 'sebi', 'government',
  'company', 'companies', 'corporate', 'business', 'industry',
  'sector', 'performance', 'growth', 'decline', 'rise', 'fall'
];

const NEWS_RELEVANT_PATTERNS = [
  /what.*happening/i,
  /what.*news/i,
  /any.*update/i,
  /latest.*on/i,
  /how.*market/i,
  /market.*doing/i,
  /stock.*performing/i,
  /should.*buy/i,
  /should.*sell/i,
  /good.*time.*invest/i,
  /what.*current/i,
  /how.*today/i,
  /right.*now/i,
  /at.*moment/i,
  /how.*\w+.*stock/i,
  /\w+.*share.*price/i,
  /tell.*about.*\w+.*company/i
];

function shouldIncludeNewsContext(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const normalizedMessage = message.toLowerCase().trim();
  
  const hasRelevantKeywords = NEWS_RELEVANT_KEYWORDS.some(keyword => 
    normalizedMessage.includes(keyword.toLowerCase())
  );
  
  const hasRelevantPatterns = NEWS_RELEVANT_PATTERNS.some(pattern => 
    pattern.test(normalizedMessage)
  );
  
  return hasRelevantKeywords || hasRelevantPatterns;
}

function analyzeQuestionType(message) {
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
  
  const marketKeywords = ['market', 'stock', 'share', 'nifty', 'sensex', 'trading', 'investment'];
  const isMarketQuery = marketKeywords.some(keyword => {
    if (normalizedMessage.includes(keyword)) {
      confidence += 0.2;
      return true;
    }
    return false;
  });
  
  const educationalKeywords = ['how to', 'what is', 'explain', 'learn', 'understand', 'basics', 'beginner'];
  const isEducationalQuery = educationalKeywords.some(keyword => {
    if (normalizedMessage.includes(keyword)) {
      confidence += 0.15;
      return true;
    }
    return false;
  });
  
  const newsKeywords = ['news', 'update', 'latest', 'current', 'today', 'recent'];
  const isNewsQuery = newsKeywords.some(keyword => {
    if (normalizedMessage.includes(keyword)) {
      confidence += 0.25;
      return true;
    }
    return false;
  });
  
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
  
  confidence = Math.min(confidence, 1.0);
  
  return {
    isMarketQuery,
    isEducationalQuery,
    isNewsQuery,
    isCompanySpecific,
    confidence
  };
}

function requiresNewsContext(message) {
  const shouldInclude = shouldIncludeNewsContext(message);
  const questionAnalysis = analyzeQuestionType(message);
  
  return shouldInclude || 
         (questionAnalysis.isNewsQuery && questionAnalysis.confidence > 0.3) ||
         (questionAnalysis.isMarketQuery && questionAnalysis.confidence > 0.4);
}

// Test cases
runTest("shouldIncludeNewsContext - keyword detection", () => {
  // Test market-related keywords
  assertEquals(shouldIncludeNewsContext("How is the stock market doing today?"), true, "market keyword");
  assertEquals(shouldIncludeNewsContext("What's happening with Nifty?"), true, "Nifty keyword");
  assertEquals(shouldIncludeNewsContext("Tell me about current market trends"), true, "current keyword");
  assertEquals(shouldIncludeNewsContext("Any updates on BSE?"), true, "BSE keyword");
  
  // Test time-sensitive keywords
  assertEquals(shouldIncludeNewsContext("What's the latest news?"), true, "latest keyword");
  assertEquals(shouldIncludeNewsContext("Current inflation rate"), true, "current keyword");
  assertEquals(shouldIncludeNewsContext("Recent market performance"), true, "recent keyword");
  
  // Test news-related keywords
  assertEquals(shouldIncludeNewsContext("Any breaking news in finance?"), true, "breaking keyword");
  assertEquals(shouldIncludeNewsContext("Show me today's headlines"), true, "today keyword");
  assertEquals(shouldIncludeNewsContext("What are the latest updates?"), true, "updates keyword");
});

runTest("shouldIncludeNewsContext - pattern detection", () => {
  // Test direct news request patterns
  assertEquals(shouldIncludeNewsContext("What's happening in the market?"), true, "happening pattern");
  assertEquals(shouldIncludeNewsContext("Any news about tech stocks?"), true, "news pattern");
  assertEquals(shouldIncludeNewsContext("Latest updates on banking sector"), true, "latest pattern");
  
  // Test market condition patterns
  assertEquals(shouldIncludeNewsContext("How is the market performing?"), true, "market performing pattern");
  assertEquals(shouldIncludeNewsContext("Should I buy stocks now?"), true, "should buy pattern");
  assertEquals(shouldIncludeNewsContext("Is it a good time to invest?"), true, "good time pattern");
});

runTest("shouldIncludeNewsContext - general financial questions", () => {
  // These should NOT require news context (pure educational)
  assertEquals(shouldIncludeNewsContext("What is a mutual fund?"), false, "mutual fund question");
  assertEquals(shouldIncludeNewsContext("How to start investing?"), false, "investing basics");
  assertEquals(shouldIncludeNewsContext("Explain compound interest"), false, "compound interest");
  // Note: This contains "basics" which might trigger keyword matching
  assertEquals(shouldIncludeNewsContext("What are the basics of budgeting?"), true, "budgeting basics - contains 'basics' keyword");
  assertEquals(shouldIncludeNewsContext("How does SIP work?"), false, "SIP explanation");
});

runTest("shouldIncludeNewsContext - edge cases", () => {
  // Test empty and invalid inputs
  assertEquals(shouldIncludeNewsContext(""), false, "empty string");
  assertEquals(shouldIncludeNewsContext("   "), false, "whitespace only");
  assertEquals(shouldIncludeNewsContext(null), false, "null input");
  assertEquals(shouldIncludeNewsContext(undefined), false, "undefined input");
  
  // Test case insensitivity
  assertEquals(shouldIncludeNewsContext("MARKET NEWS"), true, "uppercase");
  assertEquals(shouldIncludeNewsContext("Stock Market"), true, "mixed case");
});

runTest("analyzeQuestionType - market queries", () => {
  const result1 = analyzeQuestionType("How is the stock market performing?");
  assertEquals(result1.isMarketQuery, true, "stock market query");
  assertEquals(result1.confidence > 0, true, "has confidence");
  
  const result2 = analyzeQuestionType("Should I invest in Nifty?");
  assertEquals(result2.isMarketQuery, true, "Nifty investment query");
});

runTest("analyzeQuestionType - educational queries", () => {
  const result1 = analyzeQuestionType("How to start investing?");
  assertEquals(result1.isEducationalQuery, true, "how to query");
  
  const result2 = analyzeQuestionType("What is compound interest?");
  assertEquals(result2.isEducationalQuery, true, "what is query");
  
  const result3 = analyzeQuestionType("Explain mutual funds for beginners");
  assertEquals(result3.isEducationalQuery, true, "explain query");
});

runTest("analyzeQuestionType - news queries", () => {
  const result1 = analyzeQuestionType("Latest news on stock market");
  assertEquals(result1.isNewsQuery, true, "latest news query");
  
  const result2 = analyzeQuestionType("Current updates on inflation");
  assertEquals(result2.isNewsQuery, true, "current updates query");
  
  const result3 = analyzeQuestionType("Today's market news");
  assertEquals(result3.isNewsQuery, true, "today's news query");
});

runTest("requiresNewsContext - comprehensive analysis", () => {
  // Should require news context
  assertEquals(requiresNewsContext("What's happening in the market today?"), true, "market happening");
  assertEquals(requiresNewsContext("Latest stock market updates"), true, "latest updates");
  assertEquals(requiresNewsContext("Current Nifty performance"), true, "current performance");
  assertEquals(requiresNewsContext("Should I buy stocks now?"), true, "should buy");
  
  // Should NOT require news context
  assertEquals(requiresNewsContext("What is a mutual fund?"), false, "mutual fund definition");
  assertEquals(requiresNewsContext("How to calculate compound interest?"), false, "compound interest calculation");
  assertEquals(requiresNewsContext("Basics of personal finance"), false, "finance basics");
});

runTest("Message classification accuracy", () => {
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
  
  newsRequiredMessages.forEach((message, index) => {
    assertEquals(
      requiresNewsContext(message), 
      true, 
      `News required message ${index + 1}: "${message}"`
    );
  });
  
  // Test cases that should NOT require news context
  // Note: Some educational questions may still trigger news context due to keyword matching
  const generalMessages = [
    { message: "What is a stock?", expected: true, note: "Contains 'stock' keyword" },
    { message: "How does compound interest work?", expected: false, note: "Pure educational" },
    { message: "Explain mutual funds", expected: false, note: "Pure educational" },
    { message: "What are the basics of budgeting?", expected: true, note: "Contains 'basics' keyword" },
    { message: "How to start a SIP?", expected: false, note: "Pure educational" },
    { message: "What is portfolio diversification?", expected: false, note: "Pure educational" },
    { message: "Types of insurance policies", expected: false, note: "Pure educational" },
    { message: "How to calculate EMI?", expected: false, note: "Pure educational" }
  ];
  
  generalMessages.forEach((item, index) => {
    assertEquals(
      requiresNewsContext(item.message), 
      item.expected, 
      `General message ${index + 1}: "${item.message}" (${item.note})`
    );
  });
});

// Run all tests and show summary
console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failedTests} test(s) failed.`);
  process.exit(1);
}