import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let didEvents = SlateTrigger.create(spec, {
  name: 'DID Events',
  key: 'did_events',
  description:
    'Triggers when a DID is created, updated, or deleted. Configure the webhook URL in the Dock Certs dashboard under Developer > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of DID event'),
      eventId: z.string().describe('Unique event identifier'),
      did: z.string().optional().describe('The affected DID'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      did: z.string().optional().describe('The affected DID'),
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
      let did = (data.did ?? (data.data as Record<string, unknown> | undefined)?.did) as
        | string
        | undefined;
      let timestamp = (data.timestamp ??
        data.created_at ??
        new Date().toISOString()) as string;

      let didEventTypes = [
        'did_create',
        'did_update_key',
        'did_update_controller',
        'did_delete'
      ];
      if (!didEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            did,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        did_create: 'did.created',
        did_update_key: 'did.key_updated',
        did_update_controller: 'did.controller_updated',
        did_delete: 'did.deleted'
      };

      let type = typeMap[ctx.input.eventType] ?? `did.${ctx.input.eventType}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          did: ctx.input.did,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          webhookPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
