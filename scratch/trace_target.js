import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');
const lines = content.split('\n');

let stack = [];

for (let i = 271; i < 1025; i++) { // Lines 272 to 1025
    let line = lines[i];
    const lineNumber = i + 1;

    // Remove self-closing tags
    line = line.replace(/<[a-zA-Z0-9.]+[^>]*\/>/g, '');

    const opens = (line.match(/<div[\s>]|<React\.Fragment[\s>]/g) || []);
    const closes = (line.match(/<\/div>|<\/React\.Fragment>/g) || []);

    opens.forEach(tag => stack.push({ tag, line: lineNumber }));
    closes.forEach(tag => {
        if (stack.length > 0) {
            const last = stack.pop();
            // console.log(`Closed ${last.tag} (from ${last.line}) at line ${lineNumber}`);
        } else {
            console.log(`EXTRA CLOSING TAG ${tag} AT LINE ${lineNumber}`);
        }
    });
}

console.log(`Final stack at 1025:`, stack);
