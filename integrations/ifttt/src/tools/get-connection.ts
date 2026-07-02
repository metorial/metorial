import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let getConnectionTool = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve the details and current status of an IFTTT connection. Returns the connection's configuration including its triggers, actions, queries, and the user's field settings if a user ID is provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection to retrieve'),
      userId: z
        .string()
        .optional()
        .describe('The user ID to retrieve user-specific connection configuration')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID'),
      status: z
        .string()
        .optional()
        .describe('The connection status (e.g., enabled, disabled)'),
      connection: z
        .any()
        .describe(
          'Full connection details including triggers, actions, queries, and user configuration'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth.token);
    let result = await client.getConnection(ctx.input.connectionId, ctx.input.userId);

    return {
      output: {
        connectionId: ctx.input.connectionId,
        status: result?.user_connection?.status || result?.status,
        connection: result
      },
      message: `Retrieved connection **${ctx.input.connectionId}**${ctx.input.userId ? ` for user ${ctx.input.userId}` : ''}.`
    };
  })
  .build();
