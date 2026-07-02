import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let getConnectionUri = SlateTool.create(spec, {
  name: 'Get Connection URI',
  key: 'get_connection_uri',
  description: `Retrieves a PostgreSQL connection URI for a Neon database and role. Use pooled=true to request a pooled connection URI.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      databaseName: z.string().describe('Database name to connect to'),
      roleName: z.string().describe('Role name to authenticate as'),
      branchId: z
        .string()
        .optional()
        .describe('Branch ID. Defaults to the project default branch if omitted.'),
      endpointId: z
        .string()
        .optional()
        .describe('Endpoint ID. Defaults to the read-write endpoint for the branch.'),
      pooled: z.boolean().optional().describe('Whether to return a pooled connection URI')
    })
  )
  .output(
    z.object({
      connectionUri: z.string().describe('PostgreSQL connection URI')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getConnectionUri(ctx.input.projectId, {
      databaseName: ctx.input.databaseName,
      roleName: ctx.input.roleName,
      branchId: ctx.input.branchId,
      endpointId: ctx.input.endpointId,
      pooled: ctx.input.pooled
    });

    return {
      output: {
        connectionUri: result.uri
      },
      message: `Retrieved ${ctx.input.pooled ? 'pooled ' : ''}connection URI for database **${ctx.input.databaseName}**.`
    };
  })
  .build();
