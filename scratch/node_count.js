import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');

const opens = (content.match(/<div[\s>]/g) || []).length;
const closes = (content.match(/<\/div>/g) || []).length;
const selfClosings = (content.match(/<div[^>]*\/>/g) || []).length;

console.log(`Opens: ${opens}`);
console.log(`Closes: ${closes}`);
console.log(`Self-closings: ${selfClosings}`);
