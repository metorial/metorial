import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRoamingClients = SlateTool.create(spec, {
  name: 'List Roaming Clients',
  key: 'list_roaming_clients',
  description: `Lists roaming client (agent) deployments. Returns agent details including hostname, OS, site association, policy assignment, tags, and update settings. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      roamingClients: z
        .array(z.record(z.string(), z.any()))
        .describe('List of roaming client objects'),
      meta: z.record(z.string(), z.any()).optional().describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listRoamingClients({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let roamingClients = result?.data ?? result ?? [];
    let meta = result?.meta;

    return {
      output: { roamingClients, meta },
      message: `Found **${roamingClients.length}** roaming client(s).`
    };
  })
  .build();
