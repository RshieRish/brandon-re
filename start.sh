#!/bin/bash

# Massachusetts Real Estate Backend Startup Script

echo "🏠 Starting Massachusetts Real Estate Backend..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please configure your IDX API credentials in .env"
fi

# Start the server
echo "🚀 Starting development server..."
npm run dev