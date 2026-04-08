import re

filepath = 'C:/Users/PHIL/Desktop/nexusOS/apps/WallpaperGen.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find all 'code: `...`' blocks
def escape_template_literals(match):
    full_block = match.group(0)
    # We want to escape ${ as \${ ONLY inside the backticks of 'code: `...`'
    # Actually, in a .tsx file, if we want a literal `${` inside a backtick string 
    # that is NOT supposed to be interpolated by TS/React, we must use \${
    
    # Let's find the content between backticks
    start_quote = full_block.find('`')
    end_quote = full_block.rfind('`')
    
    if start_quote != -1 and end_quote != -1:
        inner = full_block[start_quote+1:end_quote]
        # Escape any ${ that are NOT already escaped
        fixed_inner = re.sub(r'(?<!\\)\$\{', '\\${', inner)
        return full_block[:start_quote+1] + fixed_inner + full_block[end_quote:]
    
    return full_block

# Apply to the whole file content
fixed_content = re.sub(r'code:\s*`[\s\S]*?`(?=\s*[,\]}])', escape_template_literals, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Fixed template literals in WallpaperGen.tsx")
