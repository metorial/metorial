import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve all connections for a given team. Connections represent authenticated links to external services used in scenarios.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('Team ID to list connections for'),
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
          teamId: z.number().optional().describe('Team ID'),
          accountLabel: z.string().optional().describe('Human-readable account label'),
          expired: z.boolean().optional().describe('Whether the connection has expired')
        })
      ),
      total: z.number().optional().describe('Total number of connections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listConnections(ctx.input.teamId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let connections = (result.connections ?? result ?? []).map((c: any) => ({
      connectionId: c.id,
      name: c.name,
      accountName: c.accountName,
      accountType: c.accountType,
      teamId: c.teamId,
      accountLabel: c.accountLabel,
      expired: c.expired
    }));

    return {
      output: {
        connections,
        total: result.pg?.total
      },
      message: `Found **${connections.length}** connection(s) in team ${ctx.input.teamId}.`
    };
  })
  .build();
