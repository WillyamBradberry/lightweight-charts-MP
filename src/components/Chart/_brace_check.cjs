// Temporary brace balance checker
const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf-8');
const lines = content.split('\n');

let braceDepth = 0;  // { }
let parenDepth = 0;  // ( )
let bracketDepth = 0; // [ ]

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNo = i + 1;
  
  // Skip comments
  const stripped = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
  
  // Skip lines that are only comments
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    continue;
  }
  
  // Simple tracking ignoring strings (approximate)
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inComment = false;
  
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    const next = line[j + 1];
    
    if (inComment) {
      if (ch === '*' && next === '/') { inComment = false; j++; }
      continue;
    }
    if (inTemplate) {
      if (ch === '`') { inTemplate = false; }
      continue;
    }
    if (inSingle) {
      if (ch === '\\') { j++; continue; }
      if (ch === "'") { inSingle = false; }
      continue;
    }
    if (inDouble) {
      if (ch === '\\') { j++; continue; }
      if (ch === '"') { inDouble = false; }
      continue;
    }
    
    if (ch === '/' && next === '/') { break; } // rest of line is comment
    if (ch === '/' && next === '*') { inComment = true; j++; continue; }
    if (ch === '`') { inTemplate = true; continue; }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (ch === '[') bracketDepth++;
    if (ch === ']') bracketDepth--;
  }
  
  if (braceDepth !== 0 || parenDepth !== 0 || bracketDepth !== 0) {
    console.log('Line ' + lineNo + ': braces=' + braceDepth + ' parens=' + parenDepth + ' brackets=' + bracketDepth + ' | ' + trimmed.substring(0, 80));
  }
}

console.log('\nFinal: braces=' + braceDepth + ' parens=' + parenDepth + ' brackets=' + bracketDepth);
