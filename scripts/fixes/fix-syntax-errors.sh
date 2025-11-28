#!/bin/bash

echo "🔧 Fixing syntax errors in route files..."

# Function to fix syntax errors in a file
fix_syntax_errors() {
    local file="$1"
    echo "🎯 Fixing syntax errors in: $file"
    
    # Remove schema declarations that are in wrong places (outside functions)
    sed -i '' '/^[[:space:]]*const schema = getActiveSchema();$/d' "$file"
    
    # Remove duplicate schema declarations
    sed -i '' '/const schema = getActiveSchema();/N;/const schema = getActiveSchema();/d' "$file"
    
    # Move schema declarations to proper locations (inside async functions)
    if grep -q "async.*req.*res" "$file"; then
        # Add schema declaration after async function declarations
        sed -i '' '/async.*req.*res.*=>/a\
      const schema = getActiveSchema();
' "$file"
    fi
    
    echo "✅ Fixed syntax errors in: $file"
}

# Find files with syntax errors
files=$(find server/routes -name "*.ts" -exec grep -l "const schema = getActiveSchema" {} \;)

for file in $files; do
    if [ -f "$file" ]; then
        fix_syntax_errors "$file"
    fi
done

echo "🎉 Syntax errors fix completed!"

