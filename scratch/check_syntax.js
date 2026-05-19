import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/app/dashboard/reports/page.tsx', 'utf8');

function count(char, str) {
  let c = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) c++;
  }
  return c;
}

console.log('Open Braces {:', count('{', content));
console.log('Close Braces }:', count('}', content));
console.log('Open Parens (:', count('(', content));
console.log('Close Parens ):', count(')', content));

// Check div tags
const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;
console.log('Open Divs:', openDivs);
console.log('Close Divs:', closeDivs);
