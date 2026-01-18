import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Available models
export const MODELS = {
  FAST: 'gpt-4o-mini',      // For scoring, title generation (cheaper)
  QUALITY: 'gpt-4o',        // For content rewriting (higher quality)
};

// Rate limiting helper
export class RateLimiter {
  private lastRequest = 0;
  private minInterval = 1000; // 1 second between requests

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

export default openai;
