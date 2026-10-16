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
      query: z
        .string()
        .optional()
        .describe(
          'Search client names, contact details, business, or address using whole words'
        ),
      email: z
        .string()
        .optional()
        .describe('Filter by one exact email address, case-insensitive'),
      emails: z
        .array(z.string())
        .max(30)
        .optional()
        .describe('Match any of up to 30 email addresses'),
      page: z.number().optional().describe('Page number (defaults to 1)'),
      perPage: z.number().optional().describe('Number of clients per page (defaults to 25)')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional(),
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
          web: z.string().optional(),
          telephone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional(),
          state: z.string().optional()
        })
      ),
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listClients(ctx.input.page, ctx.input.perPage, ctx.input);

    return {
      output: {
        clients: result.items,
        raw: result.raw,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** clients (page ${result.pagination.currentPage} of ${result.pagination.totalPages}).`
    };
  })
  .build();
