import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getEventTypeName } from '../lib/event-types';
import { spec } from '../spec';

export let organizationEvents = SlateTrigger.create(spec, {
  name: 'Organization Events',
  key: 'organization_events',
  description:
    'Polls for new organization events including user actions, vault operations, collection changes, group changes, policy updates, and Secrets Manager operations.'
})
  .input(
    z.object({
      eventTypeCode: z.number().describe('Numeric event type code'),
      eventDate: z.string().describe('ISO 8601 timestamp of the event'),
      itemId: z.string().nullable().describe('Related vault item ID'),
      collectionId: z.string().nullable().describe('Related collection ID'),
      groupId: z.string().nullable().describe('Related group ID'),
      policyId: z.string().nullable().describe('Related policy ID'),
      memberId: z.string().nullable().describe('Related member ID'),
      actingUserId: z.string().nullable().describe('User who performed the action'),
      device: z.number().nullable().describe('Device type code'),
      ipAddress: z.string().nullable().describe('IP address of the request')
    })
  )
  .output(
    z.object({
      eventTypeCode: z.number().describe('Numeric event type code'),
      eventTypeName: z
        .string()
        .describe('Human-readable event type (e.g. user.logged_in, item.created)'),
      eventDate: z.string().describe('ISO 8601 timestamp of the event'),
      itemId: z.string().nullable().describe('Related vault item ID'),
      collectionId: z.string().nullable().describe('Related collection ID'),
      groupId: z.string().nullable().describe('Related group ID'),
      policyId: z.string().nullable().describe('Related policy ID'),
      memberId: z.string().nullable().describe('Related member ID'),
      actingUserId: z.string().nullable().describe('User who performed the action'),
      device: z.number().nullable().describe('Device type code'),
      ipAddress: z.string().nullable().describe('IP address of the request')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        serverUrl: ctx.auth.serverUrl
      });

      let state = ctx.state as { lastPollDate?: string } | null;
      let start = state?.lastPollDate ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let now = new Date().toISOString();

      let events = await client.listAllEvents({ start, end: now });

      return {
        inputs: events.map(e => ({
          eventTypeCode: e.type,
          eventDate: e.date,
          itemId: e.itemId,
          collectionId: e.collectionId,
          groupId: e.groupId,
          policyId: e.policyId,
          memberId: e.memberId,
          actingUserId: e.actingUserId,
          device: e.device,
          ipAddress: e.ipAddress
        })),
        updatedState: {
          lastPollDate: now
        }
      };
    },

    handleEvent: async ctx => {
      let typeName = getEventTypeName(ctx.input.eventTypeCode);

      let idParts = [
        ctx.input.eventDate,
        ctx.input.eventTypeCode.toString(),
        ctx.input.actingUserId ?? '',
        ctx.input.memberId ?? '',
        ctx.input.itemId ?? '',
        ctx.input.collectionId ?? '',
        ctx.input.groupId ?? '',
        ctx.input.policyId ?? '',
        ctx.input.ipAddress ?? ''
      ];
      let eventId = idParts.join('_');

      return {
        type: typeName,
        id: eventId,
        output: {
          eventTypeCode: ctx.input.eventTypeCode,
          eventTypeName: typeName,
          eventDate: ctx.input.eventDate,
          itemId: ctx.input.itemId,
          collectionId: ctx.input.collectionId,
          groupId: ctx.input.groupId,
          policyId: ctx.input.policyId,
          memberId: ctx.input.memberId,
          actingUserId: ctx.input.actingUserId,
          device: ctx.input.device,
          ipAddress: ctx.input.ipAddress
        }
      };
    }
  })
  .build();
