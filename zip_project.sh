#!/bin/bash

echo "📦 Creating clean project ZIP archive..."
echo "Excluding: node_modules, Python virtual environments, Git history, Pycache, pytest caches, and uploaded assets..."

# Run zip command
zip -r FinSightAI_Enhanced.zip . \
    -x "**/node_modules/*" \
    -x "**/venv/*" \
    -x "**/.git/*" \
    -x "**/.pytest_cache/*" \
    -x "**/__pycache__/*" \
    -x "backend/uploads/*" \
    -x "*.zip" \
    -x "zip_project.sh"

if [ $? -eq 0 ]; then
    echo "✅ Success! Archive saved as FinSightAI_Enhanced.zip"
else
    echo "❌ Failed to create ZIP archive."
fi
