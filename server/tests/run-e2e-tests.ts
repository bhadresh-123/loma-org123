
import { exec } from 'child_process';

// Start the server in test mode
console.log('Starting server for E2E tests...');
const server = exec('npm run dev');

// Wait for server to start
setTimeout(() => {
  console.log('Running E2E tests...');
  
  // Run the E2E tests
  const tests = exec('npx vitest run server/tests/session-complete.test.ts');
  
  tests.stdout?.on('data', (data) => {
    console.log(data);
  });
  
  tests.stderr?.on('data', (data) => {
    console.error(data);
  });
  
  tests.on('exit', (code) => {
    console.log(`Tests completed with exit code ${code}`);
    
    // Kill the server process
    server.kill();
    process.exit(code || 0);
  });
}, 5000); // Wait 5 seconds for server to start

server.stdout?.on('data', (data) => {
  console.log(`Server: ${data}`);
});

server.stderr?.on('data', (data) => {
  console.error(`Server error: ${data}`);
});
