import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let validatorEvents = SlateTrigger.create(spec, {
  name: 'Validator Events',
  key: 'validator_events',
  description: `Receive webhook notifications for Ethereum validator events from Beaconcha.in. Covers block proposals, missed attestations, sync committee assignments, slashings, validator status changes (activation, exit, withdrawal), and machine monitoring alerts.
Webhooks must be configured manually at https://beaconcha.in/user/webhooks by pointing to the provided webhook URL.`
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of validator event (e.g., proposal_assigned, attestation_missed, slashing, status_change)'
        ),
      eventId: z.string().describe('Unique identifier for this event'),
      validatorIndex: z
        .string()
        .optional()
        .describe('Validator index associated with the event'),
      rawPayload: z.any().describe('Raw webhook payload from Beaconcha.in')
    })
  )
  .output(
    z.object({
      validatorIndex: z
        .string()
        .optional()
        .describe('Validator index associated with the event'),
      validatorPublicKey: z.string().optional().describe('Validator public key if available'),
      epoch: z.number().optional().describe('Epoch associated with the event'),
      slot: z.number().optional().describe('Slot associated with the event'),
      eventTitle: z.string().optional().describe('Human-readable title of the event'),
      eventDescription: z
        .string()
        .optional()
        .describe('Human-readable description of what happened'),
      network: z
        .string()
        .optional()
        .describe('Network the event occurred on (mainnet, hoodi, etc.)'),
      timestamp: z.string().optional().describe('Timestamp of the event in ISO 8601 format'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional event-specific metadata')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Beaconcha.in may send events as a single object or array
      let events = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any, index: number) => {
        let eventType = event.type ?? event.event_type ?? event.event ?? 'unknown';
        let eventId =
          event.id ??
          event.event_id ??
          `${eventType}_${event.validator_index ?? ''}_${event.epoch ?? ''}_${Date.now()}_${index}`;

        return {
          eventType: String(eventType),
          eventId: String(eventId),
          validatorIndex:
            event.validator_index !== undefined ? String(event.validator_index) : undefined,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, validatorIndex, rawPayload } = ctx.input;

      let normalizedType = eventType.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      let typePrefix = 'validator';

      // Map known event types
      if (normalizedType.includes('proposal') || normalizedType.includes('block')) {
        typePrefix = 'proposal';
      } else if (normalizedType.includes('attestation')) {
        typePrefix = 'attestation';
      } else if (normalizedType.includes('sync')) {
        typePrefix = 'sync_committee';
      } else if (normalizedType.includes('slash')) {
        typePrefix = 'slashing';
      } else if (
        normalizedType.includes('exit') ||
        normalizedType.includes('activation') ||
        normalizedType.includes('withdrawal') ||
        normalizedType.includes('status')
      ) {
        typePrefix = 'validator_status';
      } else if (
        normalizedType.includes('machine') ||
        normalizedType.includes('cpu') ||
        normalizedType.includes('ram') ||
        normalizedType.includes('monitoring')
      ) {
        typePrefix = 'machine_monitoring';
      }

      let epoch = rawPayload.epoch !== undefined ? Number(rawPayload.epoch) : undefined;
      let slot = rawPayload.slot !== undefined ? Number(rawPayload.slot) : undefined;

      let timestamp: string | undefined;
      if (rawPayload.timestamp) {
        timestamp =
          typeof rawPayload.timestamp === 'number'
            ? new Date(rawPayload.timestamp * 1000).toISOString()
            : String(rawPayload.timestamp);
      } else {
        timestamp = new Date().toISOString();
      }

      return {
        type: `${typePrefix}.${normalizedType}`,
        id: eventId,
        output: {
          validatorIndex:
            validatorIndex ??
            (rawPayload.validator_index !== undefined
              ? String(rawPayload.validator_index)
              : undefined),
          validatorPublicKey:
            rawPayload.public_key ??
            rawPayload.pubkey ??
            rawPayload.validator_pubkey ??
            undefined,
          epoch,
          slot,
          eventTitle: rawPayload.title ?? rawPayload.event_title ?? undefined,
          eventDescription:
            rawPayload.description ?? rawPayload.message ?? rawPayload.body ?? undefined,
          network: rawPayload.network ?? rawPayload.chain ?? undefined,
          timestamp,
          metadata: rawPayload
        }
      };
    }
  })
  .build();
