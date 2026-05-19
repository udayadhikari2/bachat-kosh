import fs from 'fs';

const content = fs.readFileSync('d:/Projects/bachat/hamro-bachat/components/dashboard/AdminView.tsx', 'utf-8');
const lines = content.split('\n');

let stack = [];

for (let i = 271; i < 1025; i++) {
    let line = lines[i];
    const lineNumber = i + 1;

    line = line.replace(/<[a-zA-Z0-9.]+[^>]*\/>/g, '');

    const opens = (line.match(/<div[\s>]|<React\.Fragment[\s>]/g) || []);
    const closes = (line.match(/<\/div>|<\/React\.Fragment>/g) || []);

    opens.forEach(tag => {
        stack.push({ tag, line: lineNumber });
        console.log(`[OPEN] ${tag} at line ${lineNumber}`);
    });
    closes.forEach(tag => {
        if (stack.length > 0) {
            const last = stack.pop();
            console.log(`[CLOSE] ${tag} at line ${lineNumber} (closed ${last.tag} from ${last.line})`);
        } else {
            console.log(`[EXTRA] ${tag} at line ${lineNumber}`);
        }
    });
}
