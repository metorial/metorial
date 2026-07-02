import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteToken: z
      .string()
      .describe(
        'GoSquared project token (e.g. GSN-123456-A). Found under Settings > Current Project > General.'
      )
  })
);
