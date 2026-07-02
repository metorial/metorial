import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signRequestEventTypes = [
  'SIGN_REQUEST.COMPLETED',
  'SIGN_REQUEST.DECLINED',
  'SIGN_REQUEST.EXPIRED',
  'SIGN_REQUEST.SIGNER_EMAIL_BOUNCED',
  'SIGN_REQUEST.SIGNER_SIGNED',
  'SIGN_REQUEST.SIGNATURE_REQUESTED',
  'SIGN_REQUEST.ERROR_FINALIZING'
] as const;

export let signRequestEvents = SlateTrigger.create(spec, {
  name: 'Sign Request Events',
  key: 'sign_request_events',
  description:
    'Triggers when Box Sign e-signature events occur: completed, declined, expired, signer signed, signature requested, signer email bounced, or error finalizing.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The Box webhook event type (e.g. SIGN_REQUEST.COMPLETED)'),
      webhookId: z.string().describe('ID of the webhook that fired'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event'),
      source: z.any().describe('The sign request object from the webhook payload'),
      triggeredBy: z.any().optional().describe('The user who triggered the event')
    })
  )
  .output(
    z.object({
      signRequestId: z.string().describe('ID of the sign request'),
      signRequestName: z.string().optional().describe('Name of the sign request'),
      status: z.string().optional().describe('Status of the sign request'),
      signers: z
        .array(
          z.object({
            email: z.string().optional(),
            role: z.string().optional(),
            signerDecision: z.string().optional()
          })
        )
        .optional()
        .describe('List of signers and their statuses'),
      triggeredByUserId: z
        .string()
        .optional()
        .describe('ID of the user who triggered the event'),
      triggeredByUserName: z
        .string()
        .optional()
        .describe('Name of the user who triggered the event'),
      triggeredAt: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook('folder', '0', ctx.input.webhookBaseUrl, [
        ...signRequestEventTypes
      ]);
      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            eventType: data.trigger,
            webhookId: data.webhook?.id || '',
            triggeredAt: data.created_at || new Date().toISOString(),
            source: data.source,
            triggeredBy: data.created_by
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let source = ctx.input.source || {};
      let triggeredBy = ctx.input.triggeredBy || {};
      let eventType = ctx.input.eventType.toLowerCase().replace('.', '.');

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${source.id || ''}-${ctx.input.triggeredAt}`,
        output: {
          signRequestId: source.id || '',
          signRequestName: source.name,
          status: source.status,
          signers: (source.signers || []).map((s: any) => ({
            email: s.email,
            role: s.role,
            signerDecision: s.signer_decision?.type
          })),
          triggeredByUserId: triggeredBy.id,
          triggeredByUserName: triggeredBy.name,
          triggeredAt: ctx.input.triggeredAt
        }
      };
    }
  });
