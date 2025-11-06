import re

# Read the file
with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove standalone console statements (entire line)
# This matches lines that are just whitespace + console.log/error/warn/info/debug + closing semicolon
content = re.sub(r'^\s*console\.(log|error|warn|info|debug)\([^;]*\);?\s*$', '', content, flags=re.MULTILINE)

# Remove trailing empty lines
lines = content.split('\n')
lines = [line for line in lines if line.strip() or not line]

# Write back
with open('app.js', 'w', encoding='utf-8', newline='') as f:
    f.write('\n'.join(lines))

print("Console statements removed successfully!")
