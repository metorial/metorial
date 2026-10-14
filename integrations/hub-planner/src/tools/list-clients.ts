import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description:
    'List client records or retrieve one client by ID. Discover stable client IDs and names before updating or deleting clients.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      clientId: z.string().optional().describe('Specific client ID. Omit to list clients.'),
      page: z.number().int().min(0).optional().describe('Page number (0-based)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum clients per page, up to 1000')
    })
  )
  .output(
    z.object({
      clients: z.array(
        z.object({
          clientId: z.string().describe('Client ID'),
          name: z.string().optional(),
          metadata: z.string().optional(),
          createdDate: z.string().optional(),
          updatedDate: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let clients = ctx.input.clientId
      ? [await client.getClient(ctx.input.clientId)]
      : await client.getClients(ctx.input.page, ctx.input.limit);
    return {
      output: {
        clients: clients.map((record: any) => ({
          clientId: record._id,
          name: record.name ?? undefined,
          metadata: record.metadata ?? undefined,
          createdDate: record.createdDate ?? undefined,
          updatedDate: record.updatedDate ?? undefined
        }))
      },
      message: `Retrieved **${clients.length}** clients.`
    };
  })
  .build();
