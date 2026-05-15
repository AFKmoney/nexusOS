import fs from 'fs';
import path from 'path';

const appsDir = path.join(process.cwd(), 'NexusPortable', 'apps');
const files = fs.readdirSync(appsDir).filter(f => f.startsWith('Mobile') && f.endsWith('App.tsx'));

files.forEach(file => {
  const filePath = path.join(appsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('DesktopComponent') && !content.includes('mobile-wrapper-content')) {
    content = content.replace('className="flex-1 overflow-auto relative z-0"', 'className="flex-1 overflow-auto relative z-0 mobile-wrapper-content"');
    fs.writeFileSync(filePath, content);
    console.log(`Patched ${file}`);
  }
});
