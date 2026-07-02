import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
  clientId: z.number().describe('Client ID'),
  name: z.string().describe('Client name'),
  color: z.string().nullable().describe('Color hex code'),
  active: z.boolean().describe('Whether the client is active'),
  externalId: z.string().nullable().describe('External reference ID'),
  updatedAt: z.string().nullable().describe('Last updated timestamp')
});

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve clients from Timely. Filter by status (active, archived, all). Clients represent the companies or entities you work for.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      show: z
        .enum(['active', 'archived', 'all'])
        .optional()
        .describe('Filter by client status'),
      limit: z.number().optional().describe('Max clients to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      clients: z.array(clientSchema),
      count: z.number().describe('Number of clients returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let clients = await client.listClients({
      show: ctx.input.show,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order: ctx.input.order
    });

    let mapped = clients.map((c: any) => ({
      clientId: c.id,
      name: c.name,
      color: c.color ?? null,
      active: c.active ?? true,
      externalId: c.external_id ?? null,
      updatedAt: c.updated_at ?? null
    }));

    return {
      output: { clients: mapped, count: mapped.length },
      message: `Found **${mapped.length}** clients.`
    };
  })
  .build();
