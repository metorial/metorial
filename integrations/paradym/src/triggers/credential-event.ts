import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let credentialEvent = SlateTrigger.create(spec, {
  name: 'Credential Event',
  key: 'credential_event',
  description:
    'Triggers on credential issuance and verification events from Paradym webhooks. Covers OpenID4VC and DIDComm protocols for both issuance and verification session state changes.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The Paradym webhook event type (e.g. openid4vc.verification.verified)'),
      eventId: z.string().describe('Unique event identifier'),
      sessionId: z.string().optional().describe('ID of the issuance or verification session'),
      projectId: z.string().optional().describe('Project ID the event belongs to'),
      status: z.string().optional().describe('Current session status'),
      credentials: z.any().optional().describe('Credential data from the event'),
      webhookPublishedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of when the event was published'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('ID of the issuance or verification session'),
      projectId: z.string().optional().describe('Project ID'),
      status: z.string().optional().describe('Session status'),
      credentials: z.any().optional().describe('Credential data'),
      webhookPublishedAt: z.string().optional().describe('Event publish timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        projectId: ctx.config.projectId
      });

      let result = await client.createWebhook({
        name: `Slates Webhook`,
        url: ctx.input.webhookBaseUrl,
        eventTypes: ['*']
      });

      let data = result.data ?? result;

      return {
        registrationDetails: {
          webhookId: data.id,
          signatureSecret: data.signatureSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        projectId: ctx.config.projectId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // The webhook payload may contain a single event or be structured differently
      // Based on Paradym's webhook format, the body contains the event data
      let eventType = body.type ?? body.eventType ?? 'unknown';
      let sessionId = body.data?.id ?? body.id ?? '';
      let eventId = `${eventType}-${sessionId}-${body.webhookPublishedAt ?? body.timestamp ?? Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            sessionId,
            projectId: body.data?.projectId ?? body.projectId,
            status: body.data?.status ?? body.status,
            credentials: body.data?.credentials ?? body.credentials,
            webhookPublishedAt: body.webhookPublishedAt ?? body.timestamp,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          sessionId: ctx.input.sessionId ?? '',
          projectId: ctx.input.projectId,
          status: ctx.input.status,
          credentials: ctx.input.credentials,
          webhookPublishedAt: ctx.input.webhookPublishedAt
        }
      };
    }
  })
  .build();
