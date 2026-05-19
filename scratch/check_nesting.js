import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');
const lines = content.split('\n');

let stack = [];
let braceCount = 0;
let parenCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Simplified tag matching
    const openDivs = (line.match(/<div(?![^>]*\/>)/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    const selfClosingDivs = (line.match(/<div[^>]*\/>/g) || []).length;

    for (let j = 0; j < openDivs; j++) stack.push({ tag: 'div', line: lineNumber });
    for (let j = 0; j < closeDivs; j++) {
        if (stack.length === 0) {
            console.log(`Extra </div> at line ${lineNumber}`);
        } else {
            stack.pop();
        }
    }

    const openFragments = (line.match(/<React\.Fragment>/g) || []).length;
    const closeFragments = (line.match(/<\/React\.Fragment>/g) || []).length;

    for (let j = 0; j < openFragments; j++) stack.push({ tag: 'Fragment', line: lineNumber });
    for (let j = 0; j < closeFragments; j++) stack.pop();

    // Check braces and parens for logic blocks
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceCount += openBraces - closeBraces;

    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    parenCount += openParens - closeParens;
}

console.log(`Final stack:`, stack);
console.log(`Final braceCount: ${braceCount}`);
console.log(`Final parenCount: ${parenCount}`);
