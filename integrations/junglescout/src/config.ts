import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    marketplace: z
      .enum(['us', 'uk', 'de', 'in', 'ca', 'fr', 'it', 'es', 'mx', 'jp'])
      .default('us')
      .describe('Target Amazon marketplace country code'),
    apiType: z
      .enum(['junglescout', 'cobalt'])
      .default('junglescout')
      .describe(
        'Account type: "junglescout" for standard accounts or "cobalt" for enterprise accounts'
      )
  })
);
