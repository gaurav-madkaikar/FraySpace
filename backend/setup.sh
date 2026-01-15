#!/bin/bash

echo "🚀 FraySpace Backend Setup"
echo "=========================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
else
    echo "✅ Node.js $(node --version) installed"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
else
    echo "✅ npm $(npm --version) installed"
fi

# Check MongoDB
if ! pgrep -x mongod > /dev/null; then
    echo "⚠️  MongoDB is not running"
    echo "   Start it with: mongod"
    echo "   Or with Docker: docker run -d -p 27017:27017 --name mongodb mongo:7"
else
    echo "✅ MongoDB is running"
fi

# Check Ollama
if ! pgrep -x ollama > /dev/null; then
    echo "⚠️  Ollama is not running"
    echo "   Start it with: ollama serve"
    echo "   Or install: curl https://ollama.ai/install.sh | sh"
else
    echo "✅ Ollama is running"
fi

echo ""

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "   Please edit .env with your configurations"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. Edit .env file if needed: nano .env"
echo "   2. Ensure MongoDB is running"
echo "   3. Ensure Ollama is running with a model (ollama pull llama2)"
echo "   4. Start the server: npm run dev"
echo ""

