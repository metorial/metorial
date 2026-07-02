import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventType: z
    .number()
    .describe(
      'Numeric event type code (e.g. 1000=UserLoggedIn, 1100=CipherCreated, 1500=OrgUserInvited)'
    ),
  itemId: z.string().nullable().describe('Related vault item ID'),
  collectionId: z.string().nullable().describe('Related collection ID'),
  groupId: z.string().nullable().describe('Related group ID'),
  policyId: z.string().nullable().describe('Related policy ID'),
  memberId: z.string().nullable().describe('Related member ID'),
  actingUserId: z.string().nullable().describe('ID of the user who performed the action'),
  date: z.string().describe('ISO 8601 timestamp of the event'),
  device: z.number().nullable().describe('Device type that generated the event'),
  ipAddress: z.string().nullable().describe('IP address of the request')
});

export let queryEvents = SlateTool.create(spec, {
  name: 'Query Event Logs',
  key: 'query_events',
  description: `Query the organization's event logs. Filter by date range, acting user, or related item. Returns timestamped records of user actions, vault operations, collection changes, and more. Supports up to 367 days of history.`,
  constraints: [
    'Date range cannot exceed 367 days.',
    'Defaults to last 30 days if no date range is provided.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      start: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)'),
      end: z.string().optional().describe('End date in ISO 8601 format'),
      actingUserId: z
        .string()
        .optional()
        .describe('Filter events by the user who performed the action'),
      itemId: z.string().optional().describe('Filter events by related vault item ID')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('Matching event log entries'),
      totalCount: z.number().describe('Total number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let events = await client.listAllEvents({
      start: ctx.input.start,
      end: ctx.input.end,
      actingUserId: ctx.input.actingUserId,
      itemId: ctx.input.itemId
    });

    let mapped = events.map(e => ({
      eventType: e.type,
      itemId: e.itemId,
      collectionId: e.collectionId,
      groupId: e.groupId,
      policyId: e.policyId,
      memberId: e.memberId,
      actingUserId: e.actingUserId,
      date: e.date,
      device: e.device,
      ipAddress: e.ipAddress
    }));

    return {
      output: {
        events: mapped,
        totalCount: mapped.length
      },
      message: `Found **${mapped.length}** event(s) matching the query.`
    };
  })
  .build();
