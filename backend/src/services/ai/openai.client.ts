import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// AI Provider type
type AIProvider = 'openai' | 'openrouter' | 'glm';

// Get AI provider from environment
const provider = (process.env.AI_PROVIDER || 'openai') as AIProvider;

// Initialize AI client based on provider
let aiClient: OpenAI;
let models: { FAST: string; QUALITY: string };

switch (provider) {
  case 'openrouter':
    aiClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      },
    });
    models = {
      FAST: 'google/gemma-2-9b-it:free', // Free or cheap model
      QUALITY: 'anthropic/claude-3.5-sonnet', // High quality model
    };
    break;

  case 'glm':
    aiClient = new OpenAI({
      apiKey: process.env.GLM_API_KEY,
      baseURL: process.env.GLM_API_BASE || 'https://open.bigmodel.cn/api/paas/v4/',
    });
    models = {
      FAST: 'glm-4-flash', // Fast and cheap
      QUALITY: 'glm-4', // High quality
    };
    break;

  case 'openai':
  default:
    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    models = {
      FAST: 'gpt-4o-mini',
      QUALITY: 'gpt-4o',
    };
    break;
}

// Export the client and models
export const ai = aiClient;
export const MODELS = models;
export const CURRENT_PROVIDER = provider;

// Rate limiting helper
export class RateLimiter {
  private lastRequest = 0;
  private minInterval = 500; // 500ms between requests

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }
}

export const rateLimiter = new RateLimiter();

// Log provider info
console.log(`🤖 AI Provider: ${provider.toUpperCase()}`);
console.log(`📡 Fast Model: ${models.FAST}`);
console.log(`✨ Quality Model: ${models.QUALITY}`);

// Export default (backward compatibility)
export default aiClient;
