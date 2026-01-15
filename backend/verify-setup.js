#!/usr/bin/env node

/**
 * FraySpace Backend Setup Verification Script
 * Checks that all components are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 FraySpace Backend Setup Verification\n');
console.log('='.repeat(50));

let allChecks = true;

// Check 1: package.json exists
console.log('\n📦 Checking package.json...');
if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('  ✅ package.json found');
    console.log(`  ✅ Project: ${pkg.name} v${pkg.version}`);

    // Check key dependencies
    const requiredDeps = ['express', 'mongoose', 'socket.io', 'joi', 'axios'];
    const missing = requiredDeps.filter(dep => !pkg.dependencies[dep]);

    if (missing.length === 0) {
        console.log('  ✅ All required dependencies listed');
    } else {
        console.log(`  ❌ Missing dependencies: ${missing.join(', ')}`);
        allChecks = false;
    }
} else {
    console.log('  ❌ package.json not found');
    allChecks = false;
}

// Check 2: node_modules exists
console.log('\n📚 Checking node_modules...');
if (fs.existsSync('node_modules')) {
    console.log('  ✅ node_modules directory exists');
} else {
    console.log('  ❌ node_modules not found - run: npm install');
    allChecks = false;
}

// Check 3: .env file
console.log('\n⚙️  Checking environment configuration...');
if (fs.existsSync('.env')) {
    console.log('  ✅ .env file exists');
    const envContent = fs.readFileSync('.env', 'utf8');

    const requiredVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'OLLAMA_URL'];
    const foundVars = requiredVars.filter(v => envContent.includes(v));

    if (foundVars.length === requiredVars.length) {
        console.log('  ✅ All required environment variables configured');
    } else {
        const missing = requiredVars.filter(v => !foundVars.includes(v));
        console.log(`  ⚠️  Missing variables: ${missing.join(', ')}`);
    }
} else {
    console.log('  ⚠️  .env file not found');
    console.log('  ℹ️  Copy .env.example to .env');
}

// Check 4: Source structure
console.log('\n📁 Checking source structure...');
const requiredDirs = [
    'src',
    'src/models',
    'src/routes',
    'src/services',
    'src/middleware',
    'src/utils'
];

const requiredFiles = [
    'src/server.js',
    'src/models/User.js',
    'src/models/Thread.js',
    'src/models/Message.js',
    'src/models/Claim.js',
    'src/routes/threads.js',
    'src/routes/messages.js',
    'src/routes/llm.js',
    'src/services/ollamaClient.js',
    'src/services/summaryService.js',
    'src/services/factCheckService.js',
    'src/services/interventionPolicy.js',
    'src/services/llmOrchestrator.js',
    'src/middleware/auth.js',
    'src/middleware/validation.js',
    'src/utils/claimDetector.js',
    'src/utils/webSearch.js'
];

let structureOk = true;

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`  ✅ ${dir}/`);
    } else {
        console.log(`  ❌ ${dir}/ missing`);
        structureOk = false;
        allChecks = false;
    }
});

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} missing`);
        structureOk = false;
        allChecks = false;
    }
});

// Check 5: Models structure
console.log('\n🗄️  Checking MongoDB models...');
const models = ['User', 'Thread', 'Message', 'Claim'];
models.forEach(model => {
    const modelPath = `src/models/${model}.js`;
    if (fs.existsSync(modelPath)) {
        const content = fs.readFileSync(modelPath, 'utf8');
        if (content.includes('mongoose.Schema') && content.includes('mongoose.model')) {
            console.log(`  ✅ ${model} model properly defined`);
        } else {
            console.log(`  ⚠️  ${model} model may be incomplete`);
        }
    }
});

// Check 6: Routes structure
console.log('\n🛣️  Checking API routes...');
const routes = ['threads', 'messages', 'llm'];
routes.forEach(route => {
    const routePath = `src/routes/${route}.js`;
    if (fs.existsSync(routePath)) {
        const content = fs.readFileSync(routePath, 'utf8');
        if (content.includes('express.Router()')) {
            console.log(`  ✅ ${route} routes properly defined`);
        } else {
            console.log(`  ⚠️  ${route} routes may be incomplete`);
        }
    }
});

// Check 7: Services structure
console.log('\n🔧 Checking services...');
const services = [
    'ollamaClient',
    'summaryService',
    'factCheckService',
    'interventionPolicy',
    'llmOrchestrator'
];
services.forEach(service => {
    const servicePath = `src/services/${service}.js`;
    if (fs.existsSync(servicePath)) {
        console.log(`  ✅ ${service} implemented`);
    }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 VERIFICATION SUMMARY\n');

if (allChecks && structureOk) {
    console.log('✅ All checks passed!');
    console.log('\n🚀 You can now start the server with:');
    console.log('   npm run dev');
    console.log('\n⚠️  Make sure MongoDB and Ollama are running:');
    console.log('   - MongoDB: brew services start mongodb-community@7.0');
    console.log('   - Ollama: ollama serve');
} else {
    console.log('❌ Some checks failed. Please review the issues above.');
    process.exit(1);
}

console.log('\n' + '='.repeat(50) + '\n');

