import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve a list of clients from Project Bubble. Clients can be associated with projects and contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of records (max 1000)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      clients: z
        .array(
          z.object({
            clientId: z.string().describe('Client ID'),
            clientName: z.string().optional().describe('Client name')
          })
        )
        .describe('List of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.getClients({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];

    let clients = data.map((c: any) => ({
      clientId: String(c.client_id),
      clientName: c.client_name || c.name || undefined
    }));

    return {
      output: { clients },
      message: `Found **${clients.length}** client(s).`
    };
  })
  .build();
