import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    defaultProvider: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default provider to route requests to (e.g., "openrouter", "openai", "bedrock"). Leave empty for automatic selection.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    routing: {
      schema: z
        .enum(['price', 'perf', 'perf_avg'])
        .optional()
        .describe(
          'Default routing strategy: "price" for cost-optimized, "perf" for performance-optimized, "perf_avg" for average performance.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
