import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');

const opens = (content.match(/\{/g) || []).length;
const closes = (content.match(/\}/g) || []).length;

console.log(`Open braces: ${opens}`);
console.log(`Close braces: ${closes}`);
