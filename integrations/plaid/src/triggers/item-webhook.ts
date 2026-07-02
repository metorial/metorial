import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let itemWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Item Webhook',
  key: 'item_webhook',
  description:
    'Receives webhook notifications about Plaid Item status changes, including errors, credential updates needed, pending expirations, and login repairs.'
})
  .input(
    z.object({
      webhookType: z.string().describe('Webhook type (e.g. ITEM)'),
      webhookCode: z
        .string()
        .describe('Webhook code (e.g. ERROR, PENDING_EXPIRATION, LOGIN_REPAIRED)'),
      itemId: z.string().describe('Plaid Item ID'),
      error: z.any().nullable().optional().describe('Error details if applicable'),
      consentExpirationTime: z
        .string()
        .nullable()
        .optional()
        .describe('Consent expiration time if applicable'),
      environment: z.string().optional().describe('Plaid environment')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Affected Item ID'),
      webhookCode: z
        .string()
        .describe(
          'Event code: ERROR, PENDING_EXPIRATION, LOGIN_REPAIRED, USER_PERMISSION_REVOKED, USER_ACCOUNT_REVOKED, NEW_ACCOUNTS_AVAILABLE'
        ),
      errorCode: z
        .string()
        .nullable()
        .optional()
        .describe('Plaid error code if in error state'),
      errorMessage: z.string().nullable().optional().describe('Human-readable error message'),
      errorType: z.string().nullable().optional().describe('Error type category'),
      consentExpirationTime: z
        .string()
        .nullable()
        .optional()
        .describe('When consent expires (ISO 8601)'),
      environment: z.string().optional().describe('Plaid environment: sandbox or production')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.webhook_type !== 'ITEM') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookType: data.webhook_type,
            webhookCode: data.webhook_code,
            itemId: data.item_id,
            error: data.error ?? null,
            consentExpirationTime: data.consent_expiration_time ?? null,
            environment: data.environment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let errorObj = ctx.input.error as any;
      return {
        type: `item.${ctx.input.webhookCode.toLowerCase()}`,
        id: `${ctx.input.itemId}-${ctx.input.webhookCode}-${Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          webhookCode: ctx.input.webhookCode,
          errorCode: errorObj?.error_code ?? null,
          errorMessage: errorObj?.error_message ?? null,
          errorType: errorObj?.error_type ?? null,
          consentExpirationTime: ctx.input.consentExpirationTime ?? null,
          environment: ctx.input.environment
        }
      };
    }
  })
  .build();
