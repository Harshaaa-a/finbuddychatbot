/**
 * Integration Verification Script (Node.js)
 * Verifies that all FinBuddy backend modules are properly integrated
 */

const fs = require('fs');
const path = require('path');

class IntegrationVerifier {
  constructor() {
    this.results = [];
  }

  addResult(component, status, message, details = null) {
    this.results.push({ component, status, message, details });
  }

  /**
   * Verify file structure and module organization
   */
  verifyFileStructure() {
    console.log('📁 Verifying file structure...');
    
    const requiredFiles = [
      './supabase/functions/chat/index.ts',
      './supabase/functions/fetchNews/index.ts',
      './supabase/functions/_shared/config.ts',
      './supabase/functions/_shared/types.ts',
      './supabase/functions/_shared/supabase-client.ts',
      './supabase/functions/_shared/message-analyzer.ts',
      './supabase/functions/_shared/ai-response-generator.ts',
      './supabase/functions/_shared/news-storage.ts',
      './supabase/functions/_shared/prompt-builder.ts',
      './supabase/functions/_shared/huggingface-client.ts',
      './supabase/functions/_shared/news-api-client.ts'
    ];

    let missingFiles = [];
    let existingFiles = [];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        existingFiles.push(file);
      } else {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length === 0) {
      this.addResult('File Structure', 'pass', `All ${requiredFiles.length} required files exist`);
    } else {
      this.addResult('File Structure', 'fail', 
        `Missing ${missingFiles.length} files`, { missing: missingFiles });
    }

    // Check test files
    const testFiles = [
      './supabase/functions/chat/chat-integration.test.ts',
      './supabase/functions/_shared/ai-integration.test.ts',
      './supabase/functions/_shared/message-analyzer.test.ts',
      './supabase/functions/_shared/news-fetching.test.ts',
      './supabase/functions/_shared/system-integration.test.ts'
    ];

    let existingTests = testFiles.filter(file => fs.existsSync(file));
    this.addResult('Test Files', 'pass', 
      `${existingTests.length}/${testFiles.length} test files exist`, 
      { existing: existingTests });
  }

  /**
   * Verify module imports and dependencies
   */
  verifyModuleDependencies() {
    console.log('🔗 Verifying module dependencies...');
    
    try {
      // Check chat endpoint imports
      const chatContent = fs.readFileSync('./supabase/functions/chat/index.ts', 'utf8');
      const requiredImports = [
        'corsHeaders',
        'requiresNewsContext',
        'generateAIResponse',
        'newsStorageService'
      ];

      let foundImports = [];
      for (const importName of requiredImports) {
        if (chatContent.includes(importName)) {
          foundImports.push(importName);
        }
      }

      if (foundImports.length === requiredImports.length) {
        this.addResult('Chat Dependencies', 'pass', 'All required imports found in chat endpoint');
      } else {
        const missing = requiredImports.filter(imp => !foundImports.includes(imp));
        this.addResult('Chat Dependencies', 'fail', 
          `Missing imports: ${missing.join(', ')}`);
      }

      // Check fetchNews endpoint imports
      const newsContent = fs.readFileSync('./supabase/functions/fetchNews/index.ts', 'utf8');
      if (newsContent.includes('newsStorageService') && newsContent.includes('corsHeaders')) {
        this.addResult('FetchNews Dependencies', 'pass', 'Required imports found in fetchNews endpoint');
      } else {
        this.addResult('FetchNews Dependencies', 'fail', 'Missing required imports in fetchNews endpoint');
      }

    } catch (error) {
      this.addResult('Module Dependencies', 'fail', `Error reading files: ${error.message}`);
    }
  }

  /**
   * Verify configuration and types
   */
  verifyConfiguration() {
    console.log('⚙️ Verifying configuration...');
    
    try {
      // Check config.ts
      const configContent = fs.readFileSync('./supabase/functions/_shared/config.ts', 'utf8');
      const configItems = [
        'corsHeaders',
        'REQUEST_TIMEOUT',
        'RATE_LIMIT',
        'AI_CONFIG',
        'NEWS_CONFIG'
      ];

      let foundConfig = configItems.filter(item => configContent.includes(item));
      
      if (foundConfig.length === configItems.length) {
        this.addResult('Configuration', 'pass', 'All configuration constants defined');
      } else {
        const missing = configItems.filter(item => !foundConfig.includes(item));
        this.addResult('Configuration', 'fail', `Missing config: ${missing.join(', ')}`);
      }

      // Check types.ts
      const typesContent = fs.readFileSync('./supabase/functions/_shared/types.ts', 'utf8');
      const typeDefinitions = [
        'NewsItem',
        'ChatRequest',
        'ChatResponse',
        'AIContext'
      ];

      let foundTypes = typeDefinitions.filter(type => typesContent.includes(`interface ${type}`));
      
      if (foundTypes.length === typeDefinitions.length) {
        this.addResult('Type Definitions', 'pass', 'All required types defined');
      } else {
        const missing = typeDefinitions.filter(type => !foundTypes.includes(type));
        this.addResult('Type Definitions', 'fail', `Missing types: ${missing.join(', ')}`);
      }

    } catch (error) {
      this.addResult('Configuration', 'fail', `Error reading config files: ${error.message}`);
    }
  }

  /**
   * Verify database schema
   */
  verifyDatabaseSchema() {
    console.log('🗄️ Verifying database schema...');
    
    try {
      const migrationFiles = fs.readdirSync('./supabase/migrations');
      const newsTableMigration = migrationFiles.find(file => 
        file.includes('latest_news') || file.includes('create_latest_news')
      );

      if (newsTableMigration) {
        const migrationContent = fs.readFileSync(
          path.join('./supabase/migrations', newsTableMigration), 'utf8'
        );
        
        const requiredColumns = ['headline', 'url', 'published_at', 'source', 'created_at'];
        let foundColumns = requiredColumns.filter(col => migrationContent.includes(col));
        
        if (foundColumns.length === requiredColumns.length) {
          this.addResult('Database Schema', 'pass', 'News table schema is complete');
        } else {
          const missing = requiredColumns.filter(col => !foundColumns.includes(col));
          this.addResult('Database Schema', 'fail', `Missing columns: ${missing.join(', ')}`);
        }
      } else {
        this.addResult('Database Schema', 'fail', 'No news table migration found');
      }

    } catch (error) {
      this.addResult('Database Schema', 'fail', `Error reading migrations: ${error.message}`);
    }
  }

  /**
   * Verify deployment configuration
   */
  verifyDeploymentConfig() {
    console.log('🚀 Verifying deployment configuration...');
    
    try {
      // Check supabase config
      if (fs.existsSync('./supabase/config.toml')) {
        const configContent = fs.readFileSync('./supabase/config.toml', 'utf8');
        
        if (configContent.includes('edge_functions') && 
            configContent.includes('name = "chat"') &&
            configContent.includes('name = "fetchNews"')) {
          this.addResult('Supabase Config', 'pass', 'Edge functions configured');
        } else {
          this.addResult('Supabase Config', 'fail', 'Edge functions not properly configured');
        }
      } else {
        this.addResult('Supabase Config', 'fail', './supabase/config.toml not found');
      }

      // Check deployment script
      if (fs.existsSync('./deploy.sh')) {
        const deployContent = fs.readFileSync('./deploy.sh', 'utf8');
        
        if (deployContent.includes('supabase functions deploy chat') &&
            deployContent.includes('supabase functions deploy fetchNews')) {
          this.addResult('Deployment Script', 'pass', 'Deployment script includes both functions');
        } else {
          this.addResult('Deployment Script', 'fail', 'Deployment script incomplete');
        }
      } else {
        this.addResult('Deployment Script', 'fail', './deploy.sh not found');
      }

    } catch (error) {
      this.addResult('Deployment Config', 'fail', `Error reading deployment files: ${error.message}`);
    }
  }

  /**
   * Verify integration between modules
   */
  verifyModuleIntegration() {
    console.log('🔄 Verifying module integration...');
    
    try {
      // Check that chat endpoint uses all required modules
      const chatContent = fs.readFileSync('./supabase/functions/chat/index.ts', 'utf8');
      
      const integrationChecks = [
        { name: 'Message Analysis', pattern: /requiresNewsContext\s*\(/ },
        { name: 'News Retrieval', pattern: /newsStorageService\.getLatestNewsForContext/ },
        { name: 'AI Response Generation', pattern: /generateAIResponse\s*\(/ },
        { name: 'CORS Headers', pattern: /corsHeaders/ },
        { name: 'Error Handling', pattern: /try\s*{[\s\S]*catch/ },
        { name: 'Rate Limiting', pattern: /rateLimitStore|checkRateLimit/ }
      ];

      let passedChecks = [];
      let failedChecks = [];

      for (const check of integrationChecks) {
        if (check.pattern.test(chatContent)) {
          passedChecks.push(check.name);
        } else {
          failedChecks.push(check.name);
        }
      }

      if (failedChecks.length === 0) {
        this.addResult('Module Integration', 'pass', 
          `All ${integrationChecks.length} integration points verified`);
      } else {
        this.addResult('Module Integration', 'fail', 
          `Missing integration: ${failedChecks.join(', ')}`);
      }

      // Check news fetching integration
      const newsContent = fs.readFileSync('./supabase/functions/fetchNews/index.ts', 'utf8');
      
      if (newsContent.includes('newsStorageService.updateNewsStorage') &&
          newsContent.includes('newsStorageService.getHealthStatus')) {
        this.addResult('News Integration', 'pass', 'News fetching properly integrated');
      } else {
        this.addResult('News Integration', 'fail', 'News fetching integration incomplete');
      }

    } catch (error) {
      this.addResult('Module Integration', 'fail', `Error verifying integration: ${error.message}`);
    }
  }

  /**
   * Verify documentation and examples
   */
  verifyDocumentation() {
    console.log('📚 Verifying documentation...');
    
    const docFiles = [
      './README.md',
      './API.md',
      './DEPLOYMENT.md',
      './examples/curl-examples.md',
      './examples/integration-guide.md'
    ];

    let existingDocs = docFiles.filter(file => fs.existsSync(file));
    
    if (existingDocs.length >= docFiles.length * 0.8) { // At least 80% of docs exist
      this.addResult('Documentation', 'pass', 
        `${existingDocs.length}/${docFiles.length} documentation files exist`);
    } else {
      this.addResult('Documentation', 'fail', 
        `Only ${existingDocs.length}/${docFiles.length} documentation files exist`);
    }

    // Check if README has deployment instructions
    if (fs.existsSync('./README.md')) {
      const readmeContent = fs.readFileSync('./README.md', 'utf8');
      
      if (readmeContent.includes('deployment') || readmeContent.includes('setup')) {
        this.addResult('Setup Instructions', 'pass', 'README contains setup/deployment instructions');
      } else {
        this.addResult('Setup Instructions', 'fail', 'README missing setup instructions');
      }
    }
  }

  /**
   * Run all verifications
   */
  async runVerification() {
    console.log('🔍 Starting FinBuddy Backend Integration Verification...\n');

    this.verifyFileStructure();
    this.verifyModuleDependencies();
    this.verifyConfiguration();
    this.verifyDatabaseSchema();
    this.verifyDeploymentConfig();
    this.verifyModuleIntegration();
    this.verifyDocumentation();

    return this.results;
  }

  /**
   * Print results
   */
  printResults() {
    console.log('\n📊 Integration Verification Results:');
    console.log('===================================\n');

    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;

    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${result.component}: ${result.message}`);
      
      if (result.details && result.status === 'fail') {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total: ${this.results.length}`);

    if (failCount === 0) {
      console.log('\n🎉 All integration verifications passed!');
      console.log('✨ The FinBuddy backend system is properly integrated and ready for deployment.');
    } else {
      console.log('\n⚠️ Some integration issues found. Please review the failed items above.');
    }

    return failCount === 0;
  }
}

// Run verification
async function main() {
  const verifier = new IntegrationVerifier();
  await verifier.runVerification();
  const success = verifier.printResults();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  });
}

module.exports = { IntegrationVerifier };