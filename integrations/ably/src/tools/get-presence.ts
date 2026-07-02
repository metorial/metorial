import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let getPresence = SlateTool.create(spec, {
  name: 'Get Presence',
  key: 'get_presence',
  description: `Retrieve the current set of members present on an Ably channel. Returns all clients currently "present" with their optional status data. Can be filtered by client ID or connection ID.`,
  instructions: [
    'Requires API Key authentication with the "presence" capability on the target channel.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
      members: z
        .array(
          z.object({
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
    let client = new AblyRestClient(ctx.auth.token);

    let members = await client.getPresence(ctx.input.channelId, {
      clientId: ctx.input.clientId,
      connectionId: ctx.input.connectionId,
      limit: ctx.input.limit
    });

    let mapped = (members || []).map((m: any) => ({
      clientId: m.clientId,
      connectionId: m.connectionId,
      memberData: m.data,
      action: m.action,
      timestamp: m.timestamp
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** member(s) present on channel **${ctx.input.channelId}**.`
    };
  })
  .build();
