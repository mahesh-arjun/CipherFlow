import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { getCipherFlowSVG } from './create-exact-logo.js';

async function buildAll() {
  const rootDir = process.cwd();
  const publicDir = path.resolve(rootDir, 'public');
  const distDir = path.resolve(rootDir, 'dist');
  const userOriginalFile = path.resolve(rootDir, 'WhatsApp Image 2026-09-04 at 2.44.53 PM.jpeg');

  if (fs.existsSync(userOriginalFile)) {
    const rawBuffer = fs.readFileSync(userOriginalFile);
    const targetNames = [
      'WhatsApp Image 2026-09-04 at 2.44.53 PM.jpeg',
      'whatsapp-image.jpeg',
      'cipherflow-logo-white.png',
      'cipherflow-logo.png',
      'cipherflow-logo-white-512.png',
      'cipherflow-logo-512.png',
      'cipherflow-logo-1024.png',
      'cipherflow-shield.png',
      'favicon.png',
    ];
    for (const name of targetNames) {
      fs.writeFileSync(path.join(publicDir, name), rawBuffer);
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, name), rawBuffer);
      }
    }
    console.log('Successfully deployed user original exact JPEG to all public assets!');
    return;
  }
}

buildAll().catch(console.error);
