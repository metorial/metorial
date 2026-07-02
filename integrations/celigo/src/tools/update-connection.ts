import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateConnection = SlateTool.create(spec, {
  name: 'Update Connection',
  key: 'update_connection',
  description: `Update an existing connection in Celigo. Replaces the connection configuration with the provided data.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to update'),
      connectionData: z
        .record(z.string(), z.any())
        .describe('Updated connection configuration object')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('ID of the updated connection'),
      name: z.string().optional().describe('Name of the updated connection'),
      type: z.string().optional().describe('Type of the updated connection'),
      rawConnection: z.any().describe('Full updated connection object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let connection = await client.updateConnection(
      ctx.input.connectionId,
      ctx.input.connectionData
    );

    return {
      output: {
        connectionId: connection._id,
        name: connection.name,
        type: connection.type,
        rawConnection: connection
      },
      message: `Updated connection **${connection.name || connection._id}**.`
    };
  })
  .build();
