import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { nextPageOutput, pageInput } from '../lib/schemas';
import { presenceAction } from '../lib/validation';
import { spec } from '../spec';

export let getPresence = SlateTool.create(spec, {
  name: 'Get Presence',
  key: 'get_presence',
  description: `Retrieve the current set of members present on an Ably channel. Returns all clients currently "present" with their optional status data. Can be filtered by client ID or connection ID.`,
  instructions: [
    'Requires API Key authentication with "presence-subscribe" or "subscribe" capability on the target channel.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: pageInput,
      channelId: z.string().describe('Channel name to get presence for'),
      clientId: z.string().optional().describe('Filter by specific client ID'),
      connectionId: z.string().optional().describe('Filter by specific connection ID'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of members to return (default: 100, max: 1000)')
    })
  )
  .output(
    z.object({
      nextPageUrl: nextPageOutput,
      members: z
        .array(
          z.object({
            raw: z
              .any()
              .optional()
              .describe('Complete provider record, including metadata and encoded values'),
            clientId: z.string().optional().describe('Client ID of the present member'),
            connectionId: z.string().optional().describe('Connection ID'),
            memberData: z.any().optional().describe('Member status payload'),
            action: z
              .string()
              .optional()
              .describe('Presence action (present, enter, leave, update)'),
            timestamp: z.number().optional().describe('Timestamp in milliseconds since epoch')
          })
        )
        .describe('List of members currently present on the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token, ctx.auth.authType);

    let page = await client.getPresence(
      ctx.input.channelId,
      {
        clientId: ctx.input.clientId,
        connectionId: ctx.input.connectionId,
        limit: ctx.input.limit
      },
      ctx.input.page
    );

    let mapped = page.items.map((m: any) => ({
      raw: m,
      clientId: m.clientId,
      connectionId: m.connectionId,
      memberData: m.data,
      action: presenceAction(m.action),
      timestamp: m.timestamp
    }));

    return {
      output: { members: mapped, nextPageUrl: page.nextPageUrl },
      message: `Found **${mapped.length}** member(s) present on channel **${ctx.input.channelId}**.`
    };
  })
  .build();
