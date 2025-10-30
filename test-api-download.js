/**
 * Test Excel Download API
 * Simulates frontend download to verify Excel file generation
 */

const fs = require('fs');
const path = require('path');

async function testDownload(endpoint, filename) {
  console.log(`\n📥 Testing ${endpoint}...`);
  
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`);
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('Content-Type')}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Error: ${error}`);
      return false;
    }

    // Get response as text to check format
    const text = await response.text();
    
    let buffer;
    
    // Check if response is JSON (SAM Local behavior)
    if (text.startsWith('{')) {
      console.log(`   📄 Response is JSON format (SAM Local behavior)`);
      const json = JSON.parse(text);
      
      if (json.body && json.isBase64Encoded) {
        console.log(`   🔓 Decoding base64 from JSON body...`);
        buffer = Buffer.from(json.body, 'base64');
      } else {
        console.log(`   ❌ Invalid JSON format`);
        return false;
      }
    } else {
      console.log(`   📦 Response is base64 string`);
      buffer = Buffer.from(text, 'base64');
    }

    // Save file
    const filepath = path.join('/tmp', filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`   💾 Saved to: ${filepath}`);
    
    // Verify it's a valid ZIP (XLSX is a ZIP file)
    const header = buffer.slice(0, 4);
    const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04;
    
    if (isZip) {
      console.log(`   ✅ Valid Excel file (ZIP signature detected)`);
      return true;
    } else {
      console.log(`   ❌ Invalid Excel file (header: ${header.toString('hex')})`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Excel Download API Test\n');
  console.log('Testing against: http://localhost:3000');
  console.log('=' .repeat(50));
  
  const tests = [
    { endpoint: '/games/download', filename: 'test-games.xlsx' },
    { endpoint: '/students/download', filename: 'test-students.xlsx' },
    { endpoint: '/teachers/download', filename: 'test-teachers.xlsx' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const success = await testDownload(test.endpoint, test.filename);
    results.push({ ...test, success });
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.endpoint}`);
  });
  
  const allPassed = results.every(r => r.success);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  
  process.exit(allPassed ? 0 : 1);
}

main();
