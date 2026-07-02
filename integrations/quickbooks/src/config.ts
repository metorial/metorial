import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['sandbox', 'production'])
      .default('production')
      .describe('QuickBooks API environment to use'),
    companyId: z
      .string()
      .min(1)
      .optional()
      .describe(
        'QuickBooks Company ID (Realm ID) for the target company. Optional when OAuth captured a realmId.'
      ),
    webhookVerifierToken: z
      .string()
      .optional()
      .describe('Optional Intuit webhook verifier token for signature validation')
  })
);
