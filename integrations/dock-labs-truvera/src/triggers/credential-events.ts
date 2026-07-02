import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let credentialEvents = SlateTrigger.create(spec, {
  name: 'Credential Events',
  key: 'credential_events',
  description:
    'Triggers when a credential is created, issued, revoked, or unrevoked. Configure the webhook URL in the Dock Certs dashboard under Developer > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of credential event'),
      eventId: z.string().describe('Unique event identifier'),
      credentialId: z.string().optional().describe('ID of the affected credential'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      credentialId: z.string().optional().describe('ID of the affected credential'),
      eventType: z.string().describe('Type of event that occurred'),
      timestamp: z.string().optional().describe('When the event occurred'),
      webhookPayload: z
        .record(z.string(), z.unknown())
        .describe('Full event data from Dock Certs')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.type ?? data.event ?? 'unknown') as string;
      let eventId = (data.id ?? data.eventId ?? `${eventType}-${Date.now()}`) as string;
      let credentialId = (data.credentialId ??
        (data.data as Record<string, unknown> | undefined)?.id) as string | undefined;
      let timestamp = (data.timestamp ??
        data.created_at ??
        new Date().toISOString()) as string;

      // Only process credential events
      let credentialEventTypes = [
        'credential_create',
        'credential_issued',
        'credential_revoke',
        'credential_unrevoke'
      ];
      if (!credentialEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            credentialId,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        credential_create: 'credential.created',
        credential_issued: 'credential.issued',
        credential_revoke: 'credential.revoked',
        credential_unrevoke: 'credential.unrevoked'
      };

      let type = typeMap[ctx.input.eventType] ?? `credential.${ctx.input.eventType}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          credentialId: ctx.input.credentialId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          webhookPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
