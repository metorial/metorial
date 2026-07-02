import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Retrieve a paginated list of clients from your Nusii account. Use pagination parameters to navigate through large client lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Number of clients per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      clients: z.array(
        z.object({
          clientId: z.string(),
          email: z.string(),
          name: z.string(),
          surname: z.string(),
          fullName: z.string(),
          currency: z.string(),
          business: z.string(),
          locale: z.string(),
          pdfPageSize: z.string(),
          web: z.string(),
          telephone: z.string(),
          address: z.string(),
          city: z.string(),
          postcode: z.string(),
          country: z.string(),
          state: z.string()
        })
      ),
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listClients(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        clients: result.items,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** clients (page ${result.pagination.currentPage} of ${result.pagination.totalPages}).`
    };
  })
  .build();
