import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description:
    'For agency partners, discover client account IDs, names, and billing counts. Client IDs can be used as the agency account ID or with manage_client.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      clients: z
        .array(
          z.object({
            clientId: z.string().describe('Client account ID'),
            name: z.string().optional().describe('Client name'),
            email: z.string().optional().describe('Client email'),
            billedUsers: z.number().optional().describe('Number of billed users'),
            billedNumbers: z.number().optional().describe('Number of billed phone numbers')
          })
        )
        .describe('Accessible client accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listClients();
    let clientsArray = Array.isArray(result) ? result : (result.clients ?? result.data ?? []);
    let clients = clientsArray.map((account: any) => ({
      clientId: String(account.id),
      name: account.name ?? `${account.fname ?? ''} ${account.lname ?? ''}`.trim(),
      email: account.email ?? undefined,
      billedUsers: account.billed_users ?? undefined,
      billedNumbers: account.billed_numbers ?? undefined
    }));
    return {
      output: { clients },
      message: `Found **${clients.length}** client account(s).`
    };
  })
  .build();
