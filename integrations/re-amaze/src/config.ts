import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    brandSubdomain: z
      .string()
      .describe(
        'The brand subdomain for your Re:amaze account (e.g., "mybrand" from mybrand.reamaze.io)'
      )
  })
);
