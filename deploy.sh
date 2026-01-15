#!/bin/bash

# 52 Puzzle Trade - GitHub Setup Script
# Run this from the 52-puzzle-trade directory

echo "🎮 Setting up 52 Puzzle Trade for GitHub..."

# Configure git
echo "📝 Configuring git..."
git config user.email "lwin.chanmyae4@gmail.com"
git config user.name "Chan Myae Lwin"

# Initialize git (if not already)
if [ ! -d .git ]; then
    echo "🔧 Initializing git repository..."
    git init
fi

# Add all files
echo "📦 Adding files..."
git add .

# Commit
echo "💾 Committing files..."
git commit -m "Initial commit: Complete 52 Puzzle Trade game with all features"

# Set main branch
echo "🌿 Setting main branch..."
git branch -M main

# Add remote (if not already added)
if ! git remote | grep -q origin; then
    echo "🔗 Adding remote repository..."
    git remote add origin git@github.com:ChanMyaeLwin/52-puzzle-trade.git
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ Done! Your code is now on GitHub!"
echo "🌐 Visit: https://github.com/ChanMyaeLwin/52-puzzle-trade"
