import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createConnection = SlateTool.create(spec, {
  name: 'Create Connection',
  key: 'create_connection',
  description: `Create a new connection in Celigo. The connection object structure varies by type (HTTP, REST, FTP, NetSuite, Salesforce, etc.). Provide the full connection configuration as the connection data object.`,
  instructions: [
    'The shape of the connection data depends on the connection type. Refer to the Celigo API documentation for the specific fields required.',
    'Common fields include: name, type, and type-specific configuration (e.g., rest.baseURI for HTTP connections).'
  ]
})
  .input(
    z.object({
      connectionData: z
        .record(z.string(), z.any())
        .describe(
          'Connection configuration object. Must include "name" and "type" at minimum, plus type-specific settings.'
        )
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('ID of the newly created connection'),
      name: z.string().optional().describe('Name of the created connection'),
      type: z.string().optional().describe('Type of the created connection'),
      rawConnection: z.any().describe('Full connection object returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let connection = await client.createConnection(ctx.input.connectionData);

    return {
      output: {
        connectionId: connection._id,
        name: connection.name,
        type: connection.type,
        rawConnection: connection
      },
      message: `Created connection **${connection.name || connection._id}** (type: ${connection.type}).`
    };
  })
  .build();
