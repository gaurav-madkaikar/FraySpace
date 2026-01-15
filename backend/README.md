# FraySpace Backend

Backend API server for FraySpace - A threaded discussion platform with LLM facilitation.

## Prerequisites

- Node.js 18+
- MongoDB (running locally on port 27017)
- Ollama (running locally on port 11434)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configurations
```

3. Ensure MongoDB is running:

```bash
# If using Docker:
docker run -d -p 27017:27017 --name mongodb mongo:7

# Or start local MongoDB:
mongod
```

4. Ensure Ollama is running:

```bash
# Install Ollama (if not already installed):
curl https://ollama.ai/install.sh | sh

# Pull a model:
ollama pull llama2

# Start Ollama server:
ollama serve
```

## Running the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check

- `GET /health` - Server health status

### Threads

- `GET /api/threads` - List threads (with filtering)
- `GET /api/threads/:id` - Get thread details
- `POST /api/threads` - Create new thread
- `PATCH /api/threads/:id` - Update thread
- `DELETE /api/threads/:id` - Delete/archive thread
- `GET /api/threads/:id/messages` - Get thread messages
- `POST /api/threads/:id/messages` - Post new message

### Messages

- `GET /api/messages/:id` - Get specific message
- `PATCH /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add/remove reaction
- `GET /api/messages/:id/edit-history` - Get edit history

### LLM Actions

- `POST /api/llm/threads/:id/summarize` - Generate thread summary
- `POST /api/llm/threads/:id/fact-check` - Fact-check a claim
- `GET /api/llm/threads/:id/claims` - Get all claims
- `POST /api/llm/threads/:id/resolve` - Generate resolution
- `POST /api/llm/claims/:id/feedback` - Submit feedback on claim

## Project Structure

```
backend/
├── src/
│   ├── models/          # MongoDB schemas
│   │   ├── User.js
│   │   ├── Thread.js
│   │   ├── Message.js
│   │   └── Claim.js
│   ├── routes/          # API route handlers
│   │   ├── threads.js
│   │   ├── messages.js
│   │   └── llm.js
│   ├── services/        # Business logic
│   │   ├── ollamaClient.js
│   │   ├── summaryService.js
│   │   ├── factCheckService.js
│   │   ├── interventionPolicy.js
│   │   └── llmOrchestrator.js
│   ├── middleware/      # Express middleware
│   │   ├── auth.js
│   │   └── validation.js
│   ├── utils/           # Utility functions
│   │   ├── claimDetector.js
│   │   └── webSearch.js
│   └── server.js        # Express app entry point
├── package.json
└── .env.example
```

## Environment Variables

| Variable     | Description                               | Default                             |
| ------------ | ----------------------------------------- | ----------------------------------- |
| PORT         | Server port                               | 5000                                |
| MONGODB_URI  | MongoDB connection string                 | mongodb://localhost:27017/frayspace |
| JWT_SECRET   | JWT signing secret                        | (required)                          |
| OLLAMA_URL   | Ollama API URL                            | http://localhost:11434              |
| OLLAMA_MODEL | Default LLM model                         | llama2                              |
| SERPAPI_KEY  | Optional: SerpAPI key for enhanced search | (optional)                          |
| CORS_ORIGIN  | CORS origin for frontend                  | http://localhost:3000               |

## Features

### LLM Integration

- Automatic thread summarization
- Fact-checking with web search
- Claim detection in messages
- Intervention policy management

### Real-time Updates

- Socket.io for live message updates
- Real-time reactions and edits
- Live summary notifications

### Validation & Security

- Joi schema validation
- JWT authentication (ready for implementation)
- Input sanitization
- Error handling

## Development Notes

- Authentication is currently mocked with a placeholder user ID for development
- Full authentication implementation is ready but not yet enabled
- Fact-checking uses DuckDuckGo by default (free, no API key needed)
- Ollama must be running locally for LLM features to work

## Testing

```bash
npm test
```

## License

MIT
