import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    phoneNumberId: {
      schema: z
        .string()
        .describe('The Phone Number ID from Meta App Dashboard under WhatsApp > API Setup'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    wabaId: {
      schema: z.string().describe('The WhatsApp Business Account ID from Meta App Dashboard'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z.string().default('v21.0').describe('Graph API version to use (e.g. v21.0)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    webhookVerifyToken: {
      schema: z
        .string()
        .optional()
        .describe(
          'Verify Token from the customer-owned Meta app webhook configuration; secured bootstrap remains blocked until configured.'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    },
    webhookAppSecret: {
      schema: z
        .string()
        .optional()
        .describe('App Secret used to authenticate WhatsApp webhook deliveries.'),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
