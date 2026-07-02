import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve all client records from TimeCamp. Clients can be associated with projects and invoices.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      clients: z.array(
        z.object({
          clientId: z.string().describe('Client ID'),
          name: z.string().describe('Client name'),
          address: z.string().describe('Client address'),
          currencyId: z.string().describe('Currency identifier')
        })
      ),
      totalClients: z.number().describe('Total number of clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let clients = await client.getClients();

    let mapped = (Array.isArray(clients) ? clients : []).map(c => ({
      clientId: String(c.client_id),
      name: c.name || '',
      address: c.address || '',
      currencyId: String(c.currency_id || '')
    }));

    return {
      output: {
        clients: mapped,
        totalClients: mapped.length
      },
      message: `Retrieved **${mapped.length}** clients.`
    };
  })
  .build();
