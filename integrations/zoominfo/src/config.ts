import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['new', 'legacy'])
      .default('legacy')
      .describe(
        'Fallback API dialect for connections created before auth methods persisted it. New OAuth connections use the current GTM Data API; legacy password/PKI connections use the Enterprise API.'
      )
  })
);
