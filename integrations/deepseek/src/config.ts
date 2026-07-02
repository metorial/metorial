import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum(['https://api.deepseek.com', 'https://api.deepseek.com/v1'])
      .default('https://api.deepseek.com')
      .describe('Base URL for the DeepSeek API. Use /v1 for OpenAI SDK compatibility.')
  })
);
