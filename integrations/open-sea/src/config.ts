import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    chain: z
      .string()
      .optional()
      .describe(
        'Default blockchain to use (e.g. ethereum, polygon, base, arbitrum). If not set, defaults to ethereum.'
      )
  })
);
