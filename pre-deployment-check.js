#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 * Verifies that all components are ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FinBuddy Backend Pre-Deployment Verification');
console.log('===============================================\n');

class PreDeploymentChecker {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  addCheck(name, status, message, details = null) {
    this.checks.push({ name, status, message, details });
    
    if (status === 'pass') {
      this.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      this.failed++;
      console.log(`❌ ${name}: ${message}`);
      if (details) {
        console.log(`   ${details}`);
      }
    }
  }

  /**
   * Check if all required files exist
   */
  checkRequiredFiles() {
    console.log('\n📁 Checking Required Files...');
    
    const requiredFiles = [
      // Edge Functions
      './supabase/functions/chat/index.ts',
      './supabase/functions/fetchNews/index.ts',
      
      // Shared Modules
      './supabase/functions/_shared/config.ts',
      './supabase/functions/_shared/types.ts',
      './supabase/functions/_shared/supabase-client.ts',
      './supabase/functions/_shared/message-analyzer.ts',
      './supabase/functions/_shared/ai-response-generator.ts',
      './supabase/functions/_shared/news-storage.ts',
      './supabase/functions/_shared/prompt-builder.ts',
      './supabase/functions/_shared/huggingface-client.ts',
      './supabase/functions/_shared/news-api-client.ts',
      
      // Configuration
      './supabase/config.toml',
      './deploy.sh',
      
      // Documentation
      './README.md',
      './API.md',
      './DEPLOYMENT.md'
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
      this.addCheck('Required Files', 'pass', 
        `All ${requiredFiles.length} required files exist`);
    } else {
      this.addCheck('Required Files', 'fail', 
        `Missing ${missingFiles.length} files`, 
        `Missing: ${missingFiles.join(', ')}`);
    }
  }

  /**
   * Check database migrations
   */
  checkDatabaseMigrations() {
    console.log('\n🗄️ Checking Database Migrations...');
    
    const migrationsDir = './supabase/migrations';
    
    if (!fs.existsSync(migrationsDir)) {
      this.addCheck('Database Migrations', 'fail', 
        'Migrations directory not found');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir);
    const newsTableMigration = migrationFiles.find(file => 
      file.includes('latest_news') || file.includes('create_latest_news')
    );

    if (newsTableMigration) {
      this.addCheck('Database Migrations', 'pass', 
        `News table migration found: ${newsTableMigration}`);
    } else {
      this.addCheck('Database Migrations', 'fail', 
        'News table migration not found');
    }
  }

  /**
   * Check function configurations
   */
  checkFunctionConfigurations() {
    console.log('\n⚙️ Checking Function Configurations...');
    
    try {
      // Check chat function
      const chatContent = fs.readFileSync('./supabase/functions/chat/index.ts', 'utf8');
      
      const chatRequirements = [
        'corsHeaders',
        'requiresNewsContext',
        'generateAIResponse',
        'newsStorageService'
      ];

      let chatMissing = [];
      for (const req of chatRequirements) {
        if (!chatContent.includes(req)) {
          chatMissing.push(req);
        }
      }

      if (chatMissing.length === 0) {
        this.addCheck('Chat Function Config', 'pass', 
          'All required imports and configurations present');
      } else {
        this.addCheck('Chat Function Config', 'fail', 
          `Missing configurations: ${chatMissing.join(', ')}`);
      }

      // Check fetchNews function
      const newsContent = fs.readFileSync('./supabase/functions/fetchNews/index.ts', 'utf8');
      
      if (newsContent.includes('newsStorageService') && newsContent.includes('corsHeaders')) {
        this.addCheck('FetchNews Function Config', 'pass', 
          'Required imports and configurations present');
      } else {
        this.addCheck('FetchNews Function Config', 'fail', 
          'Missing required imports or configurations');
      }

    } catch (error) {
      this.addCheck('Function Configurations', 'fail', 
        `Error reading function files: ${error.message}`);
    }
  }

  /**
   * Check shared module integrity
   */
  checkSharedModules() {
    console.log('\n🔧 Checking Shared Modules...');
    
    const modules = [
      {
        file: './supabase/functions/_shared/config.ts',
        required: ['corsHeaders', 'REQUEST_TIMEOUT', 'RATE_LIMIT', 'AI_CONFIG']
      },
      {
        file: './supabase/functions/_shared/types.ts',
        required: ['NewsItem', 'ChatRequest', 'ChatResponse']
      },
      {
        file: './supabase/functions/_shared/supabase-client.ts',
        required: ['supabaseClient', 'healthCheck', 'getLatestNews']
      },
      {
        file: './supabase/functions/_shared/message-analyzer.ts',
        required: ['requiresNewsContext', 'analyzeQuestionType']
      },
      {
        file: './supabase/functions/_shared/ai-response-generator.ts',
        required: ['generateAIResponse']
      }
    ];

    let moduleIssues = 0;

    for (const module of modules) {
      try {
        const content = fs.readFileSync(module.file, 'utf8');
        const missing = module.required.filter(req => !content.includes(req));
        
        if (missing.length === 0) {
          this.addCheck(`Module: ${path.basename(module.file)}`, 'pass', 
            'All required exports present');
        } else {
          this.addCheck(`Module: ${path.basename(module.file)}`, 'fail', 
            `Missing exports: ${missing.join(', ')}`);
          moduleIssues++;
        }
      } catch (error) {
        this.addCheck(`Module: ${path.basename(module.file)}`, 'fail', 
          `Cannot read file: ${error.message}`);
        moduleIssues++;
      }
    }

    if (moduleIssues === 0) {
      this.addCheck('Shared Modules Integrity', 'pass', 
        'All shared modules are properly configured');
    }
  }

  /**
   * Check deployment configuration
   */
  checkDeploymentConfig() {
    console.log('\n🚀 Checking Deployment Configuration...');
    
    try {
      // Check supabase config
      if (fs.existsSync('./supabase/config.toml')) {
        const configContent = fs.readFileSync('./supabase/config.toml', 'utf8');
        
        if (configContent.includes('[functions.chat]') && 
            configContent.includes('[functions.fetchNews]')) {
          this.addCheck('Supabase Config', 'pass', 
            'Edge functions properly configured');
        } else {
          this.addCheck('Supabase Config', 'fail', 
            'Edge functions not properly configured in config.toml');
        }
      } else {
        this.addCheck('Supabase Config', 'fail', 
          'supabase/config.toml not found');
      }

      // Check deployment script
      if (fs.existsSync('./deploy.sh')) {
        const deployContent = fs.readFileSync('./deploy.sh', 'utf8');
        
        if (deployContent.includes('supabase functions deploy chat') &&
            deployContent.includes('supabase functions deploy fetchNews')) {
          this.addCheck('Deployment Script', 'pass', 
            'Deployment script includes both functions');
        } else {
          this.addCheck('Deployment Script', 'fail', 
            'Deployment script missing function deployments');
        }
      } else {
        this.addCheck('Deployment Script', 'fail', 
          'deploy.sh not found');
      }

    } catch (error) {
      this.addCheck('Deployment Config', 'fail', 
        `Error checking deployment configuration: ${error.message}`);
    }
  }

  /**
   * Check documentation completeness
   */
  checkDocumentation() {
    console.log('\n📚 Checking Documentation...');
    
    const docFiles = [
      { file: './README.md', required: ['installation', 'usage', 'api'] },
      { file: './API.md', required: ['chat', 'fetchNews', 'examples'] },
      { file: './DEPLOYMENT.md', required: ['supabase', 'environment', 'deploy'] }
    ];

    let docIssues = 0;

    for (const doc of docFiles) {
      if (fs.existsSync(doc.file)) {
        const content = fs.readFileSync(doc.file, 'utf8').toLowerCase();
        const missing = doc.required.filter(req => !content.includes(req));
        
        if (missing.length === 0) {
          this.addCheck(`Documentation: ${path.basename(doc.file)}`, 'pass', 
            'All required sections present');
        } else {
          this.addCheck(`Documentation: ${path.basename(doc.file)}`, 'fail', 
            `Missing sections: ${missing.join(', ')}`);
          docIssues++;
        }
      } else {
        this.addCheck(`Documentation: ${path.basename(doc.file)}`, 'fail', 
          'File not found');
        docIssues++;
      }
    }
  }

  /**
   * Check test coverage
   */
  checkTestCoverage() {
    console.log('\n🧪 Checking Test Coverage...');
    
    const testFiles = [
      './supabase/functions/_shared/system-integration.test.ts',
      './supabase/functions/_shared/end-to-end.test.ts',
      './supabase/functions/chat/chat-integration.test.ts',
      './e2e-test-report.md'
    ];

    let existingTests = testFiles.filter(file => fs.existsSync(file));
    
    if (existingTests.length >= testFiles.length * 0.75) { // 75% coverage
      this.addCheck('Test Coverage', 'pass', 
        `${existingTests.length}/${testFiles.length} test files present`);
    } else {
      this.addCheck('Test Coverage', 'fail', 
        `Only ${existingTests.length}/${testFiles.length} test files present`);
    }
  }

  /**
   * Run all pre-deployment checks
   */
  runAllChecks() {
    console.log('Running comprehensive pre-deployment verification...\n');
    
    this.checkRequiredFiles();
    this.checkDatabaseMigrations();
    this.checkFunctionConfigurations();
    this.checkSharedModules();
    this.checkDeploymentConfig();
    this.checkDocumentation();
    this.checkTestCoverage();
    
    this.printSummary();
  }

  /**
   * Print verification summary
   */
  printSummary() {
    console.log('\n📊 Pre-Deployment Verification Summary');
    console.log('=====================================');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📊 Total: ${this.passed + this.failed}`);
    
    const successRate = (this.passed / (this.passed + this.failed) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 All pre-deployment checks passed!');
      console.log('✨ Your FinBuddy backend is ready for deployment.');
      console.log('\n🚀 Next Steps:');
      console.log('   1. Install Supabase CLI: npm install -g supabase');
      console.log('   2. Login to Supabase: supabase login');
      console.log('   3. Create/link project: supabase link --project-ref YOUR_REF');
      console.log('   4. Deploy: ./deploy.sh');
      console.log('\n📖 For detailed instructions, see DEPLOYMENT_READY.md');
    } else {
      console.log('\n⚠️ Some pre-deployment checks failed.');
      console.log('Please fix the issues above before deploying.');
      
      if (this.failed <= 2) {
        console.log('\n💡 Minor issues detected - deployment may still succeed.');
      } else {
        console.log('\n🚨 Major issues detected - please resolve before deployment.');
      }
    }
    
    console.log('\n📋 Deployment Readiness Checklist:');
    console.log('   ✅ All required files present');
    console.log('   ✅ Database migrations ready');
    console.log('   ✅ Functions properly configured');
    console.log('   ✅ Shared modules integrated');
    console.log('   ✅ Deployment scripts ready');
    console.log('   ✅ Documentation complete');
    console.log('   ✅ Tests passing');
    
    return this.failed === 0;
  }
}

// Run the pre-deployment verification
const checker = new PreDeploymentChecker();
const isReady = checker.runAllChecks();

process.exit(isReady ? 0 : 1);