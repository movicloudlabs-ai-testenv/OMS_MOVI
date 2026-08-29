import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('==============================================');
console.log('📦 OWMS Automated Setup');
console.log('==============================================\n');

// 1. Ensure .env files exist
const backendEnv = path.join(rootDir, 'backend', '.env');
const backendEnvExample = path.join(rootDir, 'backend', '.env.example');
if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
  fs.copyFileSync(backendEnvExample, backendEnv);
  console.log('✅ Created backend/.env from .env.example');
}

const frontendEnv = path.join(rootDir, 'frontend', '.env');
const frontendEnvExample = path.join(rootDir, 'frontend', '.env.example');
if (!fs.existsSync(frontendEnv) && fs.existsSync(frontendEnvExample)) {
  fs.copyFileSync(frontendEnvExample, frontendEnv);
  console.log('✅ Created frontend/.env from .env.example');
}

// 2. Install backend dependencies
console.log('\n[1/2] Installing backend dependencies...');
execSync('npm install', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });

// 3. Install frontend dependencies
console.log('\n[2/2] Installing frontend dependencies...');
execSync('npm install', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });

console.log('\n==============================================');
console.log('🎉 Setup complete! Run "npm run dev" or "start.bat" to start OWMS.');
console.log('==============================================\n');
