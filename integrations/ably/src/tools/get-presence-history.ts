import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { nextPageOutput, pageInput } from '../lib/schemas';
import { presenceAction } from '../lib/validation';
import { spec } from '../spec';

export let getPresenceHistory = SlateTool.create(spec, {
  name: 'Get Presence History',
  key: 'get_presence_history',
  description: `Retrieve historical presence events from an Ably channel. Returns a log of all presence actions (enter, leave, update) that occurred within the specified time range.`,
  instructions: [
    'Requires API Key authentication with the "history" capability on the target channel.',
    'Times are specified as milliseconds since Unix epoch.'
  ],
  constraints: ['Maximum 1000 events per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: pageInput,
      channelId: z.string().describe('Channel name to retrieve presence history from'),
      start: z
        .string()
        .optional()
        .describe('Start of time window as milliseconds since Unix epoch'),
      end: z
        .string()
        .optional()
        .describe('End of time window as milliseconds since Unix epoch'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of events to return (default: 100, max: 1000)'),
      direction: z
        .enum(['forwards', 'backwards'])
        .optional()
        .describe(
          'Query direction: "forwards" (oldest first) or "backwards" (newest first, default)'
        )
    })
  )
  .output(
    z.object({
      nextPageUrl: nextPageOutput,
      events: z
        .array(
          z.object({
            raw: z
              .any()
              .optional()
              .describe('Complete provider record, including metadata and encoded values'),
            clientId: z.string().optional().describe('Client ID of the member'),
            connectionId: z.string().optional().describe('Connection ID'),
            memberData: z.any().optional().describe('Member status payload at time of event'),
            action: z
              .string()
              .optional()
              .describe('Presence action (enter, leave, update, present)'),
            timestamp: z
              .number()
              .optional()
              .describe('Event timestamp in milliseconds since epoch')
          })
        )
        .describe('List of historical presence events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token, ctx.auth.authType);

    let page = await client.getPresenceHistory(
      ctx.input.channelId,
      {
        start: ctx.input.start,
        end: ctx.input.end,
        limit: ctx.input.limit,
        direction: ctx.input.direction
      },
      ctx.input.page
    );

    let mapped = page.items.map((e: any) => ({
      raw: e,
      clientId: e.clientId,
      connectionId: e.connectionId,
      memberData: e.data,
      action: presenceAction(e.action),
      timestamp: e.timestamp
    }));

    return {
      output: { events: mapped, nextPageUrl: page.nextPageUrl },
      message: `Retrieved **${mapped.length}** presence event(s) from channel **${ctx.input.channelId}**.`
    };
  })
  .build();
