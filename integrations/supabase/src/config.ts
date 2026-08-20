import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectRef: {
      schema: z
        .string()
        .optional()
        .describe(
          'Supabase project reference ID (e.g., "abcdefghijklmnop"). Required for project-level data operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
