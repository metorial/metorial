import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    shopUuid: z
      .string()
      .optional()
      .describe(
        'Default shop UUID to use for operations that require a shop. Call list_shops to discover shops. Can be overridden per-tool.'
      )
  })
);
