import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .optional()
      .describe('Optional project ID for tracking API usage across multiple projects')
  })
);
