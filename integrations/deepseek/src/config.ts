import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum(['https://api.deepseek.com', 'https://api.deepseek.com/v1'])
        .default('https://api.deepseek.com')
        .describe('Base URL for the DeepSeek API. Use /v1 for OpenAI SDK compatibility.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
