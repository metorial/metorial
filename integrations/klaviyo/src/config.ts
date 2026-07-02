import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    revision: z
      .string()
      .default('2026-04-15')
      .describe('Klaviyo API revision date (e.g., 2026-04-15). Controls API version behavior.')
  })
);
