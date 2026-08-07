import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .string()
      .default('v21.0')
      .describe('Instagram Graph API version (e.g. v21.0)'),
    webhookVerifyToken: z
      .string()
      .optional()
      .describe(
        'Verify Token from the customer-owned Meta app Webhooks settings; when set, webhook URL verification requires an exact match. Leave unset only for legacy unverified callbacks.'
      )
  })
);
