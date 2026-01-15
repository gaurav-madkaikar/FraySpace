const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b';

/**
 * Check if Ollama service is available
 */
async function checkOllamaHealth() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000
    });
    return {
      available: true,
      models: response.data.models || []
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Generate completion from Ollama
 * @param {string} prompt - The prompt to send to the model
 * @param {object} options - Configuration options
 * @returns {Promise<object>} - Parsed JSON response from model
 */
async function generateCompletion(prompt, options = {}) {
  try {
    const {
      model = DEFAULT_MODEL,
      format = 'json',
      temperature = 0.7,
      stream = false,
      system = null
    } = options;
    
    const requestBody = {
      model,
      prompt,
      stream,
      options: {
        temperature
      }
    };
    
    if (format === 'json') {
      requestBody.format = 'json';
    }
    
    if (system) {
      requestBody.system = system;
    }
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      requestBody,
      {
        timeout: 120000 // 2 minutes timeout
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    let responseText = response.data.response;
    
    // If format is JSON, parse the response
    if (format === 'json') {
      try {
        responseText = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Model did not return valid JSON');
      }
    }
    
    return {
      response: responseText,
      model: response.data.model,
      processingTime,
      done: response.data.done,
      context: response.data.context
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama service is not running. Please start Ollama with: ollama serve');
    }
    if (error.response?.status === 404) {
      throw new Error(`Model "${options.model || DEFAULT_MODEL}" not found. Pull it with: ollama pull ${options.model || DEFAULT_MODEL}`);
    }
    throw error;
  }
}

/**
 * Generate chat completion with message history
 * @param {Array} messages - Array of message objects with role and content
 * @param {object} options - Configuration options
 * @returns {Promise<object>} - Response from model
 */
async function generateChatCompletion(messages, options = {}) {
  try {
    const {
      model = DEFAULT_MODEL,
      temperature = 0.7,
      stream = false
    } = options;
    
    const requestBody = {
      model,
      messages,
      stream,
      options: {
        temperature
      }
    };
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/chat`,
      requestBody,
      {
        timeout: 120000
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    return {
      message: response.data.message,
      model: response.data.model,
      processingTime,
      done: response.data.done
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama service is not running. Please start Ollama with: ollama serve');
    }
    throw error;
  }
}

/**
 * Generate embeddings for text
 * @param {string} text - Text to generate embeddings for
 * @param {string} model - Model to use for embeddings
 * @returns {Promise<Array>} - Embedding vector
 */
async function generateEmbedding(text, model = 'gemma3:1b') {
  try {
    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/embeddings`,
      {
        model,
        prompt: text
      },
      {
        timeout: 60000
      }
    );
    
    return response.data.embedding;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama service is not running');
    }
    throw error;
  }
}

/**
 * List available models
 * @returns {Promise<Array>} - List of available models
 */
async function listModels() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    return response.data.models || [];
  } catch (error) {
    throw new Error('Failed to fetch available models');
  }
}

module.exports = {
  checkOllamaHealth,
  generateCompletion,
  generateChatCompletion,
  generateEmbedding,
  listModels
};

