import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConnection = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve details of a specific connection by its ID, and optionally test whether it is operational.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('ID of the connection to retrieve'),
      testConnection: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also ping the connection to verify it is operational')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('Unique connection identifier'),
      name: z.string().optional().describe('Connection name'),
      type: z.string().optional().describe('Connection type'),
      lastModified: z.string().optional().describe('Last modification timestamp'),
      offline: z.boolean().optional().describe('Whether the connection is offline'),
      pingResult: z
        .any()
        .optional()
        .describe('Result of the connection ping test, if requested'),
      rawConnection: z.any().describe('Full connection object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let connection = await client.getConnection(ctx.input.connectionId);

    let pingResult: any;
    if (ctx.input.testConnection) {
      try {
        pingResult = await client.pingConnection(ctx.input.connectionId);
      } catch (err: any) {
        pingResult = { error: err.message || 'Ping failed' };
      }
    }

    return {
      output: {
        connectionId: connection._id,
        name: connection.name,
        type: connection.type,
        lastModified: connection.lastModified,
        offline: connection.offline,
        pingResult,
        rawConnection: connection
      },
      message: `Retrieved connection **${connection.name || connection._id}**${pingResult ? ` (ping: ${pingResult.code === 200 ? 'OK' : 'failed'})` : ''}.`
    };
  })
  .build();
