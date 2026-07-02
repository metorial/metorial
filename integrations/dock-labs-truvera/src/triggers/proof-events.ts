import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let proofEvents = SlateTrigger.create(spec, {
  name: 'Proof Events',
  key: 'proof_events',
  description:
    'Triggers when a proof is submitted by a credential holder in response to a proof request. Configure the webhook URL in the Dock Certs dashboard under Developer > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of proof event'),
      eventId: z.string().describe('Unique event identifier'),
      proofRequestId: z.string().optional().describe('ID of the related proof request'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      proofRequestId: z.string().optional().describe('ID of the related proof request'),
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
      let proofRequestId = (data.proofRequestId ??
        (data.data as Record<string, unknown> | undefined)?.id) as string | undefined;
      let timestamp = (data.timestamp ??
        data.created_at ??
        new Date().toISOString()) as string;

      if (eventType !== 'proof_submitted') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            proofRequestId,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'proof.submitted',
        id: ctx.input.eventId,
        output: {
          proofRequestId: ctx.input.proofRequestId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          webhookPayload: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
