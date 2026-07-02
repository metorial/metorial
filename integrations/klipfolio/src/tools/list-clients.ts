import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `List client accounts in your Klipfolio organization. Filter by status or external ID. Useful for agencies and multi-tenant setups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'trial', 'setup', 'disabled'])
        .optional()
        .describe('Filter by client status'),
      externalId: z.string().optional().describe('Filter by external identifier'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include associations (groups, users, share rights)'),
      limit: z.number().optional().describe('Maximum number of results (max 100)'),
      offset: z.number().optional().describe('Index of first result to return')
    })
  )
  .output(
    z.object({
      clients: z.array(
        z.object({
          clientId: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.string().optional(),
          seats: z.number().optional(),
          lastSignIn: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listClients({
      status: ctx.input.status,
      externalId: ctx.input.externalId,
      full: ctx.input.includeDetails,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let clients = (result?.data || []).map((c: any) => ({
      clientId: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      seats: c.seats,
      lastSignIn: c.last_sign_in
    }));

    return {
      output: {
        clients,
        total: result?.meta?.total
      },
      message: `Found **${clients.length}** client(s)${result?.meta?.total ? ` out of ${result.meta.total} total` : ''}.`
    };
  })
  .build();
