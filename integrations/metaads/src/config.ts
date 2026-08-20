import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    adAccountId: {
      schema: z
        .string()
        .describe(
          'Meta Ad Account ID (e.g., act_123456789). This is used as the default ad account for all operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    businessId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional Meta Business ID used by product catalog tools. You can also pass businessId directly to those tools.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z.string().default('v25.0').describe('Graph API version to use (e.g., v25.0)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webhookVerifyToken: {
      schema: z
        .string()
        .optional()
        .describe(
          'Verify Token from the customer-owned Meta app Webhooks settings; secured bootstrap remains blocked until configured.'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    },
    webhookAppSecret: {
      schema: z
        .string()
        .optional()
        .describe('App Secret used to authenticate Meta Ads webhook deliveries.'),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
