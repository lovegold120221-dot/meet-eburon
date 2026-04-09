
import re

file_path = 'tasks.md'

with open(file_path, 'r') as f:
    content = f.read()

# Fix MD032: Lists should be surrounded by blank lines
# Look for "Label:\n- " and replace with "Label:\n\n- "
# Common labels in tasks.md based on user provided errors + file view
labels = [
    "Plan:", "Risks:", "Changed:", "Tests:", "Result:", "Status:", 
    "Current behavior or state:", "Plan and scope for this task:", 
    "Files or modules expected to change:", "Risks or things to watch out for:",
    "WORK CHECKLIST", "Summary of what actually changed:", "Files actually modified:",
    "How it was tested:", "Test result:", "Known limitations or follow-up tasks:"
]

# We want to match "Label:\n" followed immediately by a list item "- " or "* " or "1. "
# But be careful not to double add if already there.
# Best approach: Ensure there is a double newline.

lines = content.split('\n')
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if i < len(lines) - 1:
        clean_line = line.strip()
        next_line = lines[i+1].strip()
        
        # Check if current line is a label and next line is a list item
        is_label = False
        for label in labels:
            if clean_line == label or clean_line.endswith(label): # approximate match
                is_label = True
                break
        
        # Also check general "header-like" lines ending in colon followed by list
        if not is_label and clean_line.endswith(':') and len(clean_line) < 50:
             is_label = True

        if is_label and (next_line.startswith('- ') or next_line.startswith('* ') or re.match(r'\d+\.', next_line)):
             new_lines.append('') # Add extra blank line

# Now join and fix MD012 (multiple blanks)
content_v2 = '\n'.join(new_lines)
content_v2 = re.sub(r'\n{3,}', '\n\n', content_v2) 

with open(file_path, 'w') as f:
    f.write(content_v2)

print("Fixed tasks.md")
