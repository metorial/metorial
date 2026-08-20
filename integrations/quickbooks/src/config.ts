import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environment: {
      schema: z
        .enum(['sandbox', 'production'])
        .default('production')
        .describe('QuickBooks API environment to use'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    companyId: {
      schema: z
        .string()
        .min(1)
        .optional()
        .describe(
          'QuickBooks Company ID (Realm ID) for the target company. Optional when OAuth captured a realmId.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webhookVerifierToken: {
      schema: z
        .string()
        .min(1)
        .describe('Intuit webhook verifier token required for webhook signature validation'),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
