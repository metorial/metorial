import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging } from '../lib/schemas';
import { spec } from '../spec';

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve a bounded page of connections for a given team. Connections represent authenticated links to external services used in scenarios.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z
        .number()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. to list connections for'
        ),
      limit: z.number().optional().describe('Maximum number of connections to return'),
      offset: z.number().optional().describe('Number of connections to skip for pagination')
    })
  )
  .output(
    z.object({
      connections: z.array(
        z.object({
          connectionId: z.number().describe('Connection ID'),
          name: z.string().optional().describe('Connection name'),
          accountName: z.string().optional().describe('Account name'),
          accountType: z.string().optional().describe('Account/app type identifier'),
          teamId: z
            .number()
            .optional()
            .describe(
              'Team ID; call list_teams after list_organizations to discover authorized IDs.'
            ),
          accountLabel: z.string().optional().describe('Human-readable account label'),
          expired: z.boolean().optional().describe('Whether the connection has expired')
        })
      ),
      page: paging.optional(),
      total: z.number().optional().describe('Total number of connections')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.listConnections(ctx.input.teamId, ctx.input);
    const connections = result.connections.map(c => ({
      connectionId: c.id,
      name: c.name,
      accountName: c.accountName ?? undefined,
      accountType: c.accountType ?? undefined,
      teamId: c.teamId,
      accountLabel: c.accountLabel ?? undefined,
      expired: c.expired
    }));
    return {
      output: { connections, page: result.pg },
      message: `Returned ${connections.length} connections in this page.`
    };
  })
  .build();
