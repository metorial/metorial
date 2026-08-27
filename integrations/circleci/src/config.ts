import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    webhookSigningSecret: z
      .string()
      .optional()
      .describe(
        'Signing secret configured on outbound CircleCI webhooks. When set, incoming build events must carry a valid CircleCI HMAC-SHA256 signature.'
      )
  })
);
