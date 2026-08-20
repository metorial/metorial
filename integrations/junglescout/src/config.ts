import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    marketplace: {
      schema: z
        .enum(['us', 'uk', 'de', 'in', 'ca', 'fr', 'it', 'es', 'mx', 'jp'])
        .default('us')
        .describe('Target Amazon marketplace country code'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiType: {
      schema: z
        .enum(['junglescout', 'cobalt'])
        .default('junglescout')
        .describe(
          'Account type: "junglescout" for standard accounts or "cobalt" for enterprise accounts'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
