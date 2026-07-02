import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve all connections in your Celigo account. Connections store credentials and configuration needed to access the applications you are integrating.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connections: z
        .array(
          z.object({
            connectionId: z.string().describe('Unique connection identifier'),
            name: z.string().optional().describe('Connection name'),
            type: z
              .string()
              .optional()
              .describe('Connection type (e.g., http, rest, netsuite, salesforce)'),
            lastModified: z.string().optional().describe('Last modification timestamp'),
            offline: z.boolean().optional().describe('Whether the connection is offline')
          })
        )
        .describe('List of connections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let connections = await client.listConnections();

    let mapped = connections.map((c: any) => ({
      connectionId: c._id,
      name: c.name,
      type: c.type,
      lastModified: c.lastModified,
      offline: c.offline
    }));

    return {
      output: { connections: mapped },
      message: `Found **${mapped.length}** connection(s).`
    };
  })
  .build();
