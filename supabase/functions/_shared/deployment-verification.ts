/**
 * Deployment Verification Script
 * Verifies that all components are properly deployed and configured
 */

import { supabaseClient } from './supabase-client.ts';
import { newsStorageService } from './news-storage.ts';
import { generateAIResponse } from './ai-response-generator.ts';
import { requiresNewsContext } from './message-analyzer.ts';

interface VerificationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class DeploymentVerifier {
  private results: VerificationResult[] = [];

  /**
   * Add a verification result
   */
  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({ component, status, message, details });
  }

  /**
   * Verify database connection and schema
   */
  async verifyDatabase(): Promise<void> {
    try {
      console.log('🔍 Verifying database connection...');
      
      const isHealthy = await supabaseClient.healthCheck();
      if (isHealthy) {
        this.addResult('Database', 'pass', 'Database connection is healthy');
      } else {
        this.addResult('Database', 'fail', 'Database connection failed');
        return;
      }

      // Test basic CRUD operations
      const testNews = [{
        headline: 'Deployment Test: System verification in progress',
        source: 'System Test',
        published_at: new Date().toISOString()
      }];

      // Insert test data
      const inserted = await supabaseClient.insertNews(testNews);
      if (inserted.length > 0) {
        this.addResult('Database CRUD', 'pass', 'Insert operation successful');
      } else {
        this.addResult('Database CRUD', 'fail', 'Insert operation failed');
      }

      // Retrieve test data
      const retrieved = await supabaseClient.getLatestNews(1);
      if (retrieved.length > 0) {
        this.addResult('Database Read', 'pass', 'Read operation successful');
      } else {
        this.addResult('Database Read', 'warning', 'No data retrieved (may be empty)');
      }

      // Clean up test data
      await (supabaseClient as any).client
        .from('latest_news')
        .delete()
        .like('headline', 'Deployment Test:%');

    } catch (error) {
      this.addResult('Database', 'fail', `Database verification failed: ${error.message}`);
    }
  }

  /**
   * Verify news storage service
   */
  async verifyNewsService(): Promise<void> {
    try {
      console.log('📰 Verifying news service...');
      
      const healthStatus = await newsStorageService.getHealthStatus();
      
      if (healthStatus.databaseHealthy) {
        this.addResult('News Service DB', 'pass', 'News service database connection healthy');
      } else {
        this.addResult('News Service DB', 'fail', 'News service database connection failed');
      }

      if (healthStatus.apiConfigured) {
        this.addResult('News API Config', 'pass', 'News API is configured');
      } else {
        this.addResult('News API Config', 'warning', 'News API not configured (NEWS_API_KEY missing)');
      }

      // Test news retrieval
      const newsItems = await newsStorageService.getLatestNewsForContext(3);
      this.addResult('News Retrieval', 'pass', `Retrieved ${newsItems.length} news items for context`);

      // Test news update (only if API is configured)
      if (healthStatus.apiConfigured) {
        try {
          const updateResult = await newsStorageService.updateNewsStorage();
          if (updateResult.success) {
            this.addResult('News Update', 'pass', 
              `News update successful: ${updateResult.inserted} inserted, ${updateResult.totalStored} total`);
          } else {
            this.addResult('News Update', 'warning', 
              `News update failed: ${updateResult.error}`);
          }
        } catch (error) {
          this.addResult('News Update', 'warning', 
            `News update error: ${error.message}`);
        }
      }

    } catch (error) {
      this.addResult('News Service', 'fail', `News service verification failed: ${error.message}`);
    }
  }

  /**
   * Verify message analysis
   */
  verifyMessageAnalysis(): void {
    try {
      console.log('🧠 Verifying message analysis...');
      
      const testCases = [
        { message: 'What is compound interest?', expectedNews: false },
        { message: 'Current market conditions today', expectedNews: true },
        { message: 'How do mutual funds work?', expectedNews: false },
        { message: 'Should I buy stocks now?', expectedNews: true }
      ];

      let passCount = 0;
      for (const testCase of testCases) {
        const needsNews = requiresNewsContext(testCase.message);
        if (needsNews === testCase.expectedNews) {
          passCount++;
        }
      }

      if (passCount === testCases.length) {
        this.addResult('Message Analysis', 'pass', 'All message analysis tests passed');
      } else {
        this.addResult('Message Analysis', 'warning', 
          `${passCount}/${testCases.length} message analysis tests passed`);
      }

    } catch (error) {
      this.addResult('Message Analysis', 'fail', `Message analysis verification failed: ${error.message}`);
    }
  }

  /**
   * Verify AI response generation
   */
  async verifyAIService(): Promise<void> {
    try {
      console.log('🤖 Verifying AI service...');
      
      // Check if HuggingFace API key is configured
      const hfApiKey = Deno.env.get('HF_API_KEY');
      if (hfApiKey) {
        this.addResult('AI API Config', 'pass', 'HuggingFace API key is configured');
      } else {
        this.addResult('AI API Config', 'warning', 'HuggingFace API key not configured (HF_API_KEY missing)');
      }

      // Test AI response generation
      const testMessage = 'What is investing?';
      const response = await generateAIResponse(testMessage);

      if (response.success) {
        this.addResult('AI Response', 'pass', 
          `AI response generated successfully (${response.message.length} characters)`);
      } else {
        this.addResult('AI Response', 'warning', 
          `AI response failed: ${response.error}`);
      }

      // Test AI response with news context
      const newsItems = await newsStorageService.getLatestNewsForContext(2);
      if (newsItems.length > 0) {
        const responseWithNews = await generateAIResponse('Current market analysis?', newsItems);
        if (responseWithNews.success) {
          this.addResult('AI with News Context', 'pass', 
            'AI response with news context successful');
        } else {
          this.addResult('AI with News Context', 'warning', 
            `AI response with news context failed: ${responseWithNews.error}`);
        }
      } else {
        this.addResult('AI with News Context', 'warning', 
          'Cannot test AI with news context - no news items available');
      }

    } catch (error) {
      this.addResult('AI Service', 'fail', `AI service verification failed: ${error.message}`);
    }
  }

  /**
   * Verify environment configuration
   */
  verifyEnvironment(): void {
    console.log('⚙️ Verifying environment configuration...');
    
    const requiredVars = [
      { name: 'SUPABASE_URL', required: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true },
      { name: 'HF_API_KEY', required: false },
      { name: 'NEWS_API_KEY', required: false }
    ];

    let configuredCount = 0;
    let requiredCount = 0;

    for (const envVar of requiredVars) {
      const value = Deno.env.get(envVar.name);
      
      if (envVar.required) {
        requiredCount++;
        if (value) {
          configuredCount++;
          this.addResult(`Env: ${envVar.name}`, 'pass', 'Required environment variable configured');
        } else {
          this.addResult(`Env: ${envVar.name}`, 'fail', 'Required environment variable missing');
        }
      } else {
        if (value) {
          this.addResult(`Env: ${envVar.name}`, 'pass', 'Optional environment variable configured');
        } else {
          this.addResult(`Env: ${envVar.name}`, 'warning', 'Optional environment variable not configured');
        }
      }
    }

    if (configuredCount === requiredCount) {
      this.addResult('Environment', 'pass', 'All required environment variables configured');
    } else {
      this.addResult('Environment', 'fail', 
        `${configuredCount}/${requiredCount} required environment variables configured`);
    }
  }

  /**
   * Run complete verification
   */
  async runVerification(): Promise<VerificationResult[]> {
    console.log('🚀 Starting deployment verification...\n');

    this.verifyEnvironment();
    await this.verifyDatabase();
    await this.verifyNewsService();
    this.verifyMessageAnalysis();
    await this.verifyAIService();

    return this.results;
  }

  /**
   * Print verification results
   */
  printResults(): void {
    console.log('\n📊 Verification Results:');
    console.log('========================\n');

    const passCount = this.results.filter(r => r.status === 'pass').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;

    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : 
                   result.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`${icon} ${result.component}: ${result.message}`);
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ⚠️ Warnings: ${warningCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total: ${this.results.length}`);

    if (failCount === 0) {
      console.log('\n🎉 Deployment verification completed successfully!');
      if (warningCount > 0) {
        console.log('⚠️ Some optional features may not be fully configured.');
      }
    } else {
      console.log('\n❌ Deployment verification found critical issues that need to be resolved.');
    }
  }

  /**
   * Get overall status
   */
  getOverallStatus(): 'pass' | 'warning' | 'fail' {
    const hasFailures = this.results.some(r => r.status === 'fail');
    const hasWarnings = this.results.some(r => r.status === 'warning');
    
    if (hasFailures) return 'fail';
    if (hasWarnings) return 'warning';
    return 'pass';
  }
}

/**
 * Main verification function
 */
export async function verifyDeployment(): Promise<{
  status: 'pass' | 'warning' | 'fail';
  results: VerificationResult[];
}> {
  const verifier = new DeploymentVerifier();
  const results = await verifier.runVerification();
  verifier.printResults();
  
  return {
    status: verifier.getOverallStatus(),
    results
  };
}

// If this script is run directly, execute verification
if (import.meta.main) {
  try {
    const verification = await verifyDeployment();
    
    // Exit with appropriate code
    if (verification.status === 'fail') {
      Deno.exit(1);
    } else if (verification.status === 'warning') {
      Deno.exit(2);
    } else {
      Deno.exit(0);
    }
  } catch (error) {
    console.error('❌ Verification script failed:', error.message);
    Deno.exit(1);
  }
}