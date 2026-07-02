import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let CREDENTIAL_EVENTS = [
  'credential_create',
  'credential_issued',
  'credential_revoke',
  'credential_unrevoke'
] as const;

export let credentialEvents = SlateTrigger.create(spec, {
  name: 'Credential Events',
  key: 'credential_events',
  description: 'Triggers when a credential is created, issued, revoked, or unrevoked.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of credential event'),
      webhookPayload: z.any().describe('Raw webhook payload from Truvera')
    })
  )
  .output(
    z.object({
      credentialId: z.string().optional().describe('ID of the affected credential'),
      issuerDid: z.string().optional().describe('DID of the credential issuer'),
      holderDid: z.string().optional().describe('DID of the credential holder'),
      credentialData: z.any().optional().describe('Additional credential data from the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...CREDENTIAL_EVENTS],
        description: 'Slates credential events webhook',
        status: 1
      });

      return {
        registrationDetails: {
          webhookId: result?.id,
          secret: result?.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.event || 'unknown',
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload;
      let data = payload?.data || {};

      let eventType = ctx.input.eventType;
      let eventTypeFormatted = eventType.replace('_', '.');

      return {
        type: eventTypeFormatted,
        id: data?.id || data?.credentialId || `${eventType}-${Date.now()}`,
        output: {
          credentialId: data?.id || data?.credentialId,
          issuerDid: data?.issuer || data?.issuerDid,
          holderDid: data?.holder || data?.holderDid || data?.subject?.id,
          credentialData: data
        }
      };
    }
  })
  .build();
