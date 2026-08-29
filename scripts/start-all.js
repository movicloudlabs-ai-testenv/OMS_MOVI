import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Ensure .env files exist
const backendEnv = path.join(rootDir, 'backend', '.env');
const backendEnvExample = path.join(rootDir, 'backend', '.env.example');
if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
  fs.copyFileSync(backendEnvExample, backendEnv);
  console.log('[SETUP] Created backend/.env from .env.example');
}

const frontendEnv = path.join(rootDir, 'frontend', '.env');
const frontendEnvExample = path.join(rootDir, 'frontend', '.env.example');
if (!fs.existsSync(frontendEnv) && fs.existsSync(frontendEnvExample)) {
  fs.copyFileSync(frontendEnvExample, frontendEnv);
  console.log('[SETUP] Created frontend/.env from .env.example');
}

console.log('==============================================');
console.log('🚀 Starting OWMS — Backend (5000) & Frontend (5173)');
console.log('==============================================\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 2. Start Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: isWin,
});

// 3. Start Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'frontend'),
  stdio: 'inherit',
  shell: isWin,
});

const cleanup = () => {
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
