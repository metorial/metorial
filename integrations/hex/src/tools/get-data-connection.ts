import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDataConnection = SlateTool.create(spec, {
  name: 'Get Data Connection',
  key: 'get_data_connection',
  description: `Retrieve detailed configuration for a specific data connection, including connection type, description, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataConnectionId: z.string().describe('UUID of the data connection to retrieve')
    })
  )
  .output(
    z.object({
      dataConnectionId: z.string(),
      name: z.string(),
      type: z.string(),
      description: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let connection = await client.getDataConnection(ctx.input.dataConnectionId);

    return {
      output: {
        dataConnectionId: connection.dataConnectionId,
        name: connection.name,
        type: connection.type,
        description: connection.description,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt
      },
      message: `Retrieved data connection **${connection.name}** (${connection.type}).`
    };
  })
  .build();
