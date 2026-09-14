import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '../../server');

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200 || res.status === 401 || res.status === 403) {
        return true;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log('Starting test server...');
  const serverProcess = spawn('node', [path.resolve(__dirname, 'testServerEntry.js')], {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', PORT: '5001' }
  });

  try {
    await waitForServer('http://127.0.0.1:5001/api/auth/status');
    console.log('Test server ready! Running vitest suite...');

    // Locate vitest CLI entry
    let vitestBin = path.resolve(serverDir, 'node_modules/vitest/vitest.mjs');
    if (!fs.existsSync(vitestBin)) {
      vitestBin = path.resolve(__dirname, '../../node_modules/vitest/vitest.mjs');
    }

    const vitestArgs = [vitestBin, 'run', '--config', path.resolve(__dirname, 'vitest.config.js')];

    const testExitCode = await new Promise((resolve) => {
      const testProcess = spawn(process.execPath, vitestArgs, {
        cwd: serverDir,
        stdio: 'inherit'
      });
      testProcess.on('close', resolve);
    });

    console.log(`Vitest completed with exit code: ${testExitCode}`);
    
    // Shut down test server
    try {
      serverProcess.kill('SIGINT');
    } catch (e) {}
    
    setTimeout(() => {
      try {
        serverProcess.kill();
      } catch (e) {}
      process.exit(testExitCode || 0);
    }, 500);
  } catch (err) {
    console.error('Test runner failed:', err);
    try {
      serverProcess.kill();
    } catch (e) {}
    process.exit(1);
  }
}

main();
