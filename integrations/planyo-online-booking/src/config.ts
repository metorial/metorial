import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        'Planyo Site ID. Required for metasite API keys to scope operations to a specific site.'
      )
  })
);
