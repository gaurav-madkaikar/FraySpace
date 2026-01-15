# FraySpace

**Threaded Discussion Platform with LLM Facilitation**

A modern discussion platform that uses AI to facilitate meaningful conversations through intelligent summarization, fact-checking, and context-aware interventions.

## 🎯 Project Status

### Phase 1A: Initial Backend Setup

The intial backend infrastructure has been implemented and is ready to run.

**What's Done:**

- Express server with Socket.io
- MongoDB schemas (User, Thread, Message, Claim)
- Complete REST API (15 endpoints)
- LLM integration services (Ollama)
- Real-time updates via WebSocket
- Fact-checking with web search
- Claim detection and verification
- Smart intervention policy
- Authentication framework (JWT ready)
- Request validation (Joi)
- Comprehensive documentation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7.0+
- Ollama (optional, for LLM features)

### Setup

1. **Install Dependencies**

```bash
cd backend
npm install
```

2. **Start MongoDB**

```bash
# Option A: Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Option B: Docker
docker run -d -p 27017:27017 --name mongodb mongo:7
```

3. **Start Ollama (Optional)**

```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama2
ollama serve
```

4. **Start Backend Server**

```bash
cd backend
npm run dev
```

Server runs at: **http://localhost:5000**

### Verify Setup

```bash
# Check health
curl http://localhost:5000/health

# Or run verification script
cd backend
node verify-setup.js
```

## 📚 Documentation
- **[backend/README.md](backend/README.md)** - API documentation

## 🏗️ Architecture

```
              ┌─────────────┐
              │   React     │ 
              │  Frontend   │
              └──────┬──────┘
                     │ HTTP/WebSocket
                     │
              ┌──────▼──────┐
              │   Express   │ 
              │   Backend   │ 
              └──────┬──────┘
                     │
       ┌─────────┬───▼──────┬──────────┐
       │         │          │          │
  ┌───-▼───-┐ ┌─-▼───┐ ┌────▼────┐ ┌───▼──┐
  │ MongoDB │ │Ollama│ │Socket.io│ │Search│
  │   DB    │ │ LLM  │ │Real-time│ │ API  │
  └─────────┘ └──────┘ └─────────┘ └──────┘
```

## 🔑 Key Features

### Intelligent Facilitation

- **Living Summaries**: Auto-generated thread summaries that update as discussions evolve
- **Fact-Checking**: Automatic verification of factual claims with source citations
- **Claim Detection**: Identifies health, legal, financial, and statistical claims
- **Smart Interventions**: Context-aware LLM participation based on thread mode

### Thread Modes

- **Casual**: Minimal AI intervention
- **Debate**: Balanced facilitation with fact-checking
- **Planning**: Active organization of action items
- **Brainstorm**: Idea clustering and synthesis
- **General**: Standard discussion mode

### Real-time Collaboration

- Live message updates
- Instant reactions
- Real-time summaries
- Collaborative editing

## 📡 API Endpoints

### Threads

- `GET /api/threads` - List threads
- `POST /api/threads` - Create thread
- `GET /api/threads/:id` - Get thread
- `PATCH /api/threads/:id` - Update thread
- `GET /api/threads/:id/messages` - Get messages
- `POST /api/threads/:id/messages` - Post message

### LLM Actions

- `POST /api/llm/threads/:id/summarize` - Generate summary
- `POST /api/llm/threads/:id/fact-check` - Verify claim
- `GET /api/llm/threads/:id/claims` - List claims

### Messages

- `GET /api/messages/:id` - Get message
- `PATCH /api/messages/:id` - Edit message
- `POST /api/messages/:id/reactions` - Add reaction

## 🛠️ Technology Stack

**Backend:**

- Node.js + Express
- MongoDB + Mongoose
- Socket.io (real-time)
- Ollama (local LLM)
- Joi (validation)

**Frontend (Coming Soon):**

- React 18
- TailwindCSS
- Axios
- Socket.io Client

## 📂 Project Structure

```
FraySpace/
├── backend/                    
│   ├── src/
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Utilities
│   │   └── server.js          # Entry point
│   ├── package.json
│   └── README.md
├── frontend/                   🔄 Phase 1C (Next)
└── README.md                   # This file
```

## 🧪 Testing

```bash
# API health check
curl http://localhost:5000/health

# Create a thread
curl -X POST http://localhost:5000/api/threads \
  -H "Content-Type: application/json" \
  -d '{"title":"My Discussion","mode":"general","visibility":"public"}'

# List threads
curl http://localhost:5000/api/threads
```

## 🔐 Security

- JWT authentication framework (ready to enable)
- Password hashing with bcrypt
- Request validation with Joi
- CORS configuration
- Input sanitization

**Note:** Currently using mock authentication for development. Enable full auth before production.

## 🎨 Additional Features

### Claim Detection

Automatically identifies:

- Statistical claims (percentages, numbers)
- Health/medical statements
- Legal/financial claims
- Scientific assertions
- Definitive statements

### Fact-Checking Process

1. Detect claim in message
2. Search web for evidence (DuckDuckGo/SerpAPI)
3. Analyze with LLM
4. Return verification status with sources
5. Store in claim database

### Intervention Policy

LLM intervenes when:

- Message threshold reached (configurable)
- User explicitly requests
- High-impact claim detected
- Contradiction identified
- User requests source verification

## 📈 Next Steps

### Phase 1B: Integrate user-level thread management
- Add user authentication, authorization and profile management
- Add user-level thread creation, deletion, and management
- Add user-level message creation, deletion, and management
- Validate LLM integration for fairness

## 🤝 Contributing

This project is currently in active development. Check the **[Next Steps](#-next-steps)** section to see what's planned next!   

Feel free to contribute to the project by creating a pull request or opening an issue.

[Backend Documentation](backend/README.md)  
**Last Updated**: January 15, 2026
