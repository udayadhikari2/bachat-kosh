import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');
const lines = content.split('\n');

let stack = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNumber = i + 1;

    // Handle self-closing tags first by removing them from the count
    line = line.replace(/<div[^>]*\/>/g, '');

    const opens = (line.match(/<div[\s>]/g) || []);
    const closes = (line.match(/<\/div>/g) || []);

    opens.forEach(() => stack.push(lineNumber));
    closes.forEach(() => {
        if (stack.length > 0) stack.pop();
        else console.log(`Extra </div> at line ${lineNumber}`);
    });
}

console.log(`Unclosed <div> tags started at these lines:`, stack);
