#!/bin/bash

echo "🔧 Updating remaining route files to use dynamic schema..."

# Function to update a route file
update_route_file() {
    local file="$1"
    echo "🎯 Updating route file: $file"
    
    # Check if file uses database queries
    if grep -q "db\." "$file" || grep -q "db.query" "$file"; then
        # Add getActiveSchema import if not present
        if ! grep -q "getActiveSchema" "$file"; then
            # Update existing db import
            if grep -q "import.*db.*from" "$file"; then
                sed -i '' 's/import { db }/import { db, getActiveSchema }/g' "$file"
                sed -i '' 's/import { db, getSchemaInfo }/import { db, getActiveSchema }/g' "$file"
            else
                # Add new import at the top
                sed -i '' '1i\
import { db, getActiveSchema } from '\''@db'\'';
' "$file"
            fi
        fi
        
        # Add schema declaration to route handlers that use db
        if grep -q "router\." "$file"; then
            # Add schema declaration after router definitions
            sed -i '' '/router\./a\
    const schema = getActiveSchema();
' "$file"
        fi
        
        echo "✅ Updated route file: $file"
    else
        echo "⏭️  Skipped route file (no db usage): $file"
    fi
}

# Get list of route files that don't use getActiveSchema
files=$(find server/routes -name "*.ts" -exec grep -L "getActiveSchema" {} \;)

# Process each file
for file in $files; do
    if [ -f "$file" ]; then
        update_route_file "$file"
    fi
done

echo "🎉 Route files update completed!"

