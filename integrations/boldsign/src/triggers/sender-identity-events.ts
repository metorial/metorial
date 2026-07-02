import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let senderIdentityEvents = SlateTrigger.create(spec, {
  name: 'Sender Identity Events',
  key: 'sender_identity_events',
  description:
    'Triggered when sender identity events occur, such as created, verified, denied, updated, deleted, or revoked.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID for deduplication'),
      eventType: z.string().describe('Type of sender identity event'),
      created: z.number().describe('Unix timestamp of the event'),
      environment: z.string().optional().describe('Event environment (Live or Test)'),
      identityName: z.string().optional().describe('Name of the sender identity'),
      identityEmail: z.string().optional().describe('Email of the sender identity'),
      identityId: z.string().optional().describe('ID of the sender identity')
    })
  )
  .output(
    z.object({
      identityId: z.string().optional().describe('ID of the sender identity'),
      identityName: z.string().optional().describe('Name of the sender identity'),
      identityEmail: z.string().optional().describe('Email of the sender identity'),
      eventType: z.string().describe('Type of event that occurred'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      environment: z.string().optional().describe('Event environment (Live or Test)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      if (body?.event?.eventType === 'Verification') {
        return { inputs: [] };
      }

      let event = body?.event;
      let data = body?.data;

      if (!event || !data) {
        return { inputs: [] };
      }

      let eventType = event.eventType as string;

      let identityEventTypes = [
        'SenderIdentityCreated',
        'SenderIdentityUpdated',
        'SenderIdentityDeleted',
        'SenderIdentityRevoked',
        'SenderIdentityVerified',
        'SenderIdentityDenied'
      ];

      if (!identityEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: event.id,
            eventType,
            created: event.created,
            environment: event.environment,
            identityName: data.name,
            identityEmail: data.email ?? data.emailAddress,
            identityId: data.senderIdentityId ?? data.id
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType;

      let typeMap: Record<string, string> = {
        SenderIdentityCreated: 'sender_identity.created',
        SenderIdentityUpdated: 'sender_identity.updated',
        SenderIdentityDeleted: 'sender_identity.deleted',
        SenderIdentityRevoked: 'sender_identity.revoked',
        SenderIdentityVerified: 'sender_identity.verified',
        SenderIdentityDenied: 'sender_identity.denied'
      };

      return {
        type: typeMap[eventType] ?? `sender_identity.${eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          identityId: ctx.input.identityId,
          identityName: ctx.input.identityName,
          identityEmail: ctx.input.identityEmail,
          eventType: ctx.input.eventType,
          eventTimestamp: ctx.input.created,
          environment: ctx.input.environment
        }
      };
    }
  })
  .build();
