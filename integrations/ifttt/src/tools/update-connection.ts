import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let updateConnectionTool = SlateTool.create(spec, {
  name: 'Update Connection',
  key: 'update_connection',
  description: `Update a user's IFTTT connection configuration. This replaces the current stored configuration for the user, including trigger fields, action fields, and query fields. Use **Get Connection** first to see current settings.`,
  instructions: [
    'The PUT request replaces all stored configurations. If a user has a trigger configured and you send an update without it, that trigger configuration will be removed.',
    'The user must have the connection enabled for this to succeed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection to update'),
      userId: z.string().describe('The user ID whose connection to update'),
      configuration: z
        .record(z.string(), z.any())
        .describe(
          'Complete native user_features replacement object. Get current configuration first; omitted configurations are removed.'
        )
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID that was updated'),
      result: z
        .any()
        .describe('Current native user_connection read back after request acceptance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth);
    let result = await client.updateUserConnection(
      ctx.input.connectionId,
      ctx.input.userId,
      ctx.input.configuration
    );

    return {
      output: {
        connectionId: ctx.input.connectionId,
        result
      },
      message: `IFTTT accepted configuration replacement for **${ctx.input.connectionId}** for user **${ctx.input.userId}**; current configuration was read back. Existing automation effects may remain.`
    };
  })
  .build();
