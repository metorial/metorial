import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let segmentEntry = SlateTrigger.create(spec, {
  name: 'Segment Entry',
  key: 'segment_entry',
  description:
    'Triggers when a user enters a segment. Provides full contact data and the segments the user now belongs to. Will not fire during bulk segment recalculations.'
})
  .input(
    z.object({
      triggeredEvent: z.string().describe('The event that triggered the webhook'),
      payload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('Refiner UUID of the contact'),
      projectUuid: z.string().describe('UUID of the Refiner project'),
      remoteId: z.string().nullable().describe('External user ID'),
      email: z.string().nullable().describe('Email of the contact'),
      displayName: z.string().nullable().describe('Display name of the contact'),
      firstSeenAt: z.string().nullable().describe('ISO 8601 timestamp of first seen'),
      lastSeenAt: z.string().nullable().describe('ISO 8601 timestamp of last seen'),
      attributes: z.record(z.string(), z.unknown()).describe('Contact attributes and traits'),
      segments: z
        .array(
          z.object({
            segmentUuid: z.string().describe('UUID of the segment'),
            name: z.string().describe('Name of the segment')
          })
        )
        .describe('Segments the contact belongs to'),
      account: z
        .object({
          accountUuid: z.string().nullable().describe('UUID of the account'),
          remoteId: z.string().nullable().describe('External account ID'),
          displayName: z.string().nullable().describe('Account display name'),
          domain: z.string().nullable().describe('Account domain')
        })
        .nullable()
        .describe('Associated account')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let triggeredEvent = data.triggered_event ?? '';

      // Segment entry events use different naming; they won't have a form object
      // They indicate a user matched a segment
      if (triggeredEvent !== 'User enters segment' && triggeredEvent !== 'Segment Match') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            triggeredEvent,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.payload as any;

      let contactUuid = data.uuid ?? '';
      let eventId = `segment_entry-${contactUuid}-${Date.now()}`;

      return {
        type: 'segment.entered',
        id: eventId,
        output: {
          contactUuid,
          projectUuid: data.project_uuid ?? '',
          remoteId: data.remote_id ?? null,
          email: data.email ?? null,
          displayName: data.display_name ?? null,
          firstSeenAt: data.first_seen_at ?? null,
          lastSeenAt: data.last_seen_at ?? null,
          attributes: data.attributes ?? {},
          segments: (data.segments || []).map((s: any) => ({
            segmentUuid: s.uuid,
            name: s.name
          })),
          account: data.account
            ? {
                accountUuid: data.account.uuid ?? null,
                remoteId: data.account.remote_id ?? null,
                displayName: data.account.display_name ?? null,
                domain: data.account.domain ?? null
              }
            : null
        }
      };
    }
  })
  .build();
