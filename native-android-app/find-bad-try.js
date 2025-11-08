const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'src', 'main', 'assets', 'app.js');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

let tryStack = [];
let issues = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check for try blocks
    if (/\btry\s*\{/.test(line)) {
        tryStack.push({ line: lineNum, indent: line.search(/\S/) });
    }
    
    // Check for catch/finally
    if (/\b(catch|finally)\s*[\(\{]/.test(line) && tryStack.length > 0) {
        tryStack.pop();
    }
    
    // Check for closing braces that might close a try without catch/finally
    if (/^\s*\}\s*$/.test(line) && tryStack.length > 0) {
        const currentIndent = line.search(/\S/);
        const tryInfo = tryStack[tryStack.length - 1];
        
        // If this closing brace matches the try block's indent level
        if (currentIndent === tryInfo.indent) {
            // Look ahead for catch/finally
            let foundCatch = false;
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                if (/\b(catch|finally)\s*[\(\{]/.test(lines[j])) {
                    foundCatch = true;
                    break;
                }
                if (lines[j].trim() && !/^\s*\}\s*$/.test(lines[j])) {
                    break; // Non-empty, non-brace line - stop looking
                }
            }
            
            if (!foundCatch) {
                issues.push({
                    tryLine: tryInfo.line,
                    closeLine: lineNum,
                    context: lines.slice(Math.max(0, tryInfo.line - 2), Math.min(lines.length, lineNum + 3)).join('\n')
                });
                tryStack.pop();
            }
        }
    }
}

console.log(`Found ${issues.length} potential try-catch issues:\n`);
issues.forEach((issue, idx) => {
    console.log(`\n=== Issue #${idx + 1} ===`);
    console.log(`Try at line ${issue.tryLine}, closes at line ${issue.closeLine}`);
    console.log('Context:');
    console.log(issue.context);
    console.log('---');
});
