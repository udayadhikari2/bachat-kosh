import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/app/dashboard/reports/page.tsx', 'utf8');

let depth = 0;
const tags = content.match(/<[a-zA-Z]+| <\/[a-zA-Z]+>/g) || [];

const openDivs = (content.match(/<div(?![^>]*\/>)/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;

console.log('Open Divs (non-self-closing):', openDivs);
console.log('Close Divs:', closeDivs);

// Find the line where it goes wrong
const lines = content.split('\n');
let currentDepth = 0;
lines.forEach((line, i) => {
  const opens = (line.match(/<div(?![^>]*\/>)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  currentDepth += opens;
  currentDepth -= closes;
  if (currentDepth < 0) console.log(`Negative depth at line ${i + 1}`);
});
console.log('Final depth:', currentDepth);
