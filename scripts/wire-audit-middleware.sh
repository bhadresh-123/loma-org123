#!/bin/bash
# Script to batch-wire audit middleware to remaining route files

# List of route files that need audit middleware wiring
FILES=(
  "server/routes/organizations.ts"
  "server/routes/profile.ts"
  "server/routes/meetings.ts"
  "server/routes/calendar-blocks.ts"
  "server/routes/tasks.ts"
  "server/routes/work-schedules.ts"
  "server/routes/notifications.ts"
  "server/routes/medical-codes.ts"
  "server/routes/cache-admin.ts"
  "server/routes/stripe.ts"
  "server/routes/connect.ts"
  "server/routes/stripe-issuing.ts"
  "server/routes/cv-parser.ts"
  "server/routes/ai-assistant.ts"
  "server/routes/status.ts"
)

echo "This script helps identify routes that need audit middleware"
echo "============================================================"
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "=== $file ==="
    echo "Routes found:"
    grep -n "^router\." "$file" | head -5
    echo ""
  fi
done

echo "Note: This is a helper script. Actual wiring must be done carefully"
echo "to ensure proper audit actions and resource types are used."

