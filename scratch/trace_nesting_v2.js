import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');
const lines = content.split('\n');

let stack = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNumber = i + 1;

    // Remove self-closing tags
    line = line.replace(/<[a-zA-Z0-9.]+[^>]*\/>/g, '');

    // Match all opening tags (div, React.Fragment, etc.)
    const opens = (line.match(/<div[\s>]|<React\.Fragment[\s>]/g) || []);
    const closes = (line.match(/<\/div>|<\/React\.Fragment>/g) || []);

    opens.forEach(tag => stack.push({ tag, line: lineNumber }));
    closes.forEach(tag => {
        if (stack.length > 0) stack.pop();
        else console.log(`Extra closing tag ${tag} at line ${lineNumber}`);
    });
}

console.log(`Remaining open tags:`, stack.length);
if (stack.length > 0) {
    console.log(`Open tags at:`, stack.slice(-20));
}
