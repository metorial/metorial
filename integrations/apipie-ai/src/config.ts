import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    defaultProvider: z
      .string()
      .optional()
      .describe(
        'Default provider to route requests to (e.g., "openrouter", "openai", "bedrock"). Leave empty for automatic selection.'
      ),
    routing: z
      .enum(['price', 'perf', 'perf_avg'])
      .optional()
      .describe(
        'Default routing strategy: "price" for cost-optimized, "perf" for performance-optimized, "perf_avg" for average performance.'
      )
  })
);
