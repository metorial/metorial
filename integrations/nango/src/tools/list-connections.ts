import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Lists all connections in the current Nango environment. Connections represent per-user, per-integration authorizations. Supports filtering by connection ID, search query, and pagination. Credentials are **not** included in the list; use the manage connection tool to get full credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z
        .string()
        .optional()
        .describe('Exact match filter for a specific connection ID'),
      search: z
        .string()
        .optional()
        .describe('Partial match search on connection IDs or user profiles'),
      limit: z.number().optional().describe('Maximum number of connections to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          connectionId: z.string().describe('User-provided connection identifier'),
          provider: z.string().describe('External service provider name'),
          providerConfigKey: z.string().describe('Integration ID / unique key'),
          created: z.string().describe('Creation timestamp'),
          metadata: z
            .record(z.string(), z.any())
            .nullable()
            .describe('Custom metadata attached to the connection'),
          tags: z.record(z.string(), z.string()).describe('Custom key-value labels'),
          errors: z
            .array(
              z.object({
                type: z.string(),
                logId: z.string()
              })
            )
            .describe('Authentication or sync errors')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listConnections({
      connectionId: ctx.input.connectionId,
      search: ctx.input.search,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let connections = result.connections.map(c => ({
      connectionId: c.connection_id,
      provider: c.provider,
      providerConfigKey: c.provider_config_key,
      created: c.created,
      metadata: c.metadata,
      tags: c.tags,
      errors: c.errors.map(e => ({ type: e.type, logId: e.log_id }))
    }));

    return {
      output: { connections },
      message: `Found **${connections.length}** connection(s).`
    };
  })
  .build();
