
import re

def dedup_languages(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    seen_codes = set()
    new_lines = []
    
    # Regex to capture code property: { code: 'xy-ZQ', ... }
    code_pattern = re.compile(r"code:\s*'([^']+)'")
    
    for line in lines:
        match = code_pattern.search(line)
        if match:
            code = match.group(1)
            if code in seen_codes:
                print(f"Removing duplicate code: {code}")
                continue # Skip this line
            seen_codes.add(code)
            new_lines.append(line)
        else:
            new_lines.append(line)
            
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Deduplication complete.")

if __name__ == "__main__":
    dedup_languages("lib/orbit/types.ts")
