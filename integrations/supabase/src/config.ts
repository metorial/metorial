import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectRef: z
      .string()
      .optional()
      .describe(
        'Supabase project reference ID (e.g., "abcdefghijklmnop"). Required for project-level data operations.'
      )
  })
);
