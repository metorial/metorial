import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    webhookVerifierToken: z
      .string()
      .optional()
      .describe('Optional Intuit webhook verifier token for signature validation')
  })
);
