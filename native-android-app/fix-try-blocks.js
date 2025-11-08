const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'src', 'main', 'assets', 'app.js');
let content = fs.readFileSync(filePath, 'utf-8');

// Pattern 1: try { ... assignmentOrCall(); defaultAssignment; }
// This should become: try { ... assignmentOrCall(); } catch(e) { defaultAssignment; }
const pattern1 = /(\s+)try\s*\{\s*\n(\s+)([^\n]+)\s*\n(\s+)([^\n]+)\s*\n(\s+)\}/g;

let fixCount = 0;
content = content.replace(pattern1, (match, indent1, indent2, line1, indent3, line2, indent4) => {
    // Check if line2 looks like a default/error assignment (simple assignment, array literal, etc.)
    if (line2.match(/^\s*([\w.]+)\s*=\s*(\[\]|{}|null|false|0|""|'')/)) {
        fixCount++;
        return `${indent1}try {\n${indent2}${line1}\n${indent3}} catch (e) {\n${indent3}${line2}\n${indent4}}`;
    }
    return match;
});

console.log(`Applied ${fixCount} fixes`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('File updated');
