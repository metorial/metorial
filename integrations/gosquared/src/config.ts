import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteToken: z
      .string()
      .optional()
      .describe(
        'GoSquared project token (e.g. GSN-123456-A). Required for project operations; use List Sites to discover accessible projects. Found under Settings > Current Project > General.'
      )
  })
);
