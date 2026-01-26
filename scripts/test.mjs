#!/usr/bin/env node
/**
 * TickTick Skill - Test Runner
 * Run all tests: node scripts/test.mjs
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const testFiles = [
  'lib.test.mjs',
  'tasks.test.mjs',
];

async function runTests() {
  console.log('🧪 Running TickTick Skill Tests\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const file of testFiles) {
    console.log(`\n📁 ${file}`);
    console.log('─'.repeat(40));
    
    const result = await new Promise((resolve) => {
      const proc = spawn('node', ['--test', join(__dirname, file)], {
        stdio: 'inherit',
        cwd: __dirname,
      });
      
      proc.on('close', (code) => resolve(code));
    });
    
    if (result !== 0) {
      totalFailed++;
    } else {
      totalPassed++;
    }
  }
  
  console.log('\n' + '═'.repeat(40));
  console.log(`📊 Test Files: ${totalPassed} passed, ${totalFailed} failed`);
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

runTests();
