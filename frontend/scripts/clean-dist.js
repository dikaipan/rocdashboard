// Script to clean dist folder before build
// This helps avoid permission errors on Windows

import { existsSync, rmSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

console.log('🧹 Cleaning dist folder...');

function removeDir(dirPath) {
  if (!existsSync(dirPath)) {
    return true;
  }

  try {
    const files = readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = join(dirPath, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        removeDir(filePath);
      } else {
        try {
          unlinkSync(filePath);
        } catch (err) {
          // File might be locked, try with force flag
          console.warn(`⚠️  Could not delete ${file}, might be locked`);
        }
      }
    }
    
    try {
      rmdirSync(dirPath);
    } catch (err) {
      // Directory might not be empty or locked
      console.warn(`⚠️  Could not remove directory ${dirPath}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error removing directory: ${error.message}`);
    return false;
  }
}

if (existsSync(distDir)) {
  console.log(`📁 Found dist folder at: ${distDir}`);
  
  // Try to remove with Node's built-in method first
  try {
    rmSync(distDir, { 
      recursive: true, 
      force: true, 
      maxRetries: 3, 
      retryDelay: 500 
    });
    console.log('✅ Dist folder cleaned successfully');
  } catch (error) {
    console.warn('⚠️  Standard removal failed, trying manual cleanup...');
    
    // Fallback: manual removal
    const success = removeDir(distDir);
    
    if (!success) {
      console.error('\n❌ ERROR: Could not clean dist folder!');
      console.error('   Error:', error.message);
      console.error('\n⚠️  Please close any programs that might be using files in the dist folder:');
      console.error('   1. Flask server (python app.py) - Press Ctrl+C to stop');
      console.error('   2. Browser with the app open - Close the browser');
      console.error('   3. File Explorer with dist folder open - Close File Explorer');
      console.error('   4. Any text editors with files from dist folder - Close editors');
      console.error('\n   Then try building again: npm run build');
      process.exit(1);
    } else {
      console.log('✅ Dist folder cleaned successfully (manual cleanup)');
    }
  }
} else {
  console.log('✅ Dist folder does not exist, no cleanup needed');
}

