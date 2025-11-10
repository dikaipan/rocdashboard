// Script to clean install dependencies
// This ensures a fresh install without cache issues
// Run this before deploying to ensure clean builds

import { existsSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '..');
const packageLockPath = join(rootDir, 'package-lock.json');
const nodeModulesPath = join(rootDir, 'node_modules');
const distPath = join(rootDir, 'dist');

console.log('🧹 Cleaning installation files...');
console.log(`   Root dir: ${rootDir}`);

// Remove package-lock.json
if (existsSync(packageLockPath)) {
  try {
    rmSync(packageLockPath, { force: true });
    console.log('✅ Removed package-lock.json');
  } catch (error) {
    console.warn('⚠️  Could not remove package-lock.json:', error.message);
  }
} else {
  console.log('ℹ️  package-lock.json not found (this is okay)');
}

// Remove node_modules
if (existsSync(nodeModulesPath)) {
  try {
    rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('✅ Removed node_modules');
  } catch (error) {
    console.warn('⚠️  Could not remove node_modules:', error.message);
    console.warn('   You may need to remove it manually');
  }
} else {
  console.log('ℹ️  node_modules not found (this is okay)');
}

// Remove dist
if (existsSync(distPath)) {
  try {
    rmSync(distPath, { recursive: true, force: true });
    console.log('✅ Removed dist');
  } catch (error) {
    console.warn('⚠️  Could not remove dist:', error.message);
  }
} else {
  console.log('ℹ️  dist not found (this is okay)');
}

console.log('✅ Cleanup complete!');
console.log('');
console.log('📦 Next steps:');
console.log('   1. Run: npm install');
console.log('   2. Run: npm run build');
console.log('   3. Verify the build works correctly');

