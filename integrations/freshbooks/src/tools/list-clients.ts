import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Search and list clients in FreshBooks. Supports filtering by email, organization, name, and status. Returns paginated results with key contact and billing information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      searchEmail: z.string().optional().describe('Filter by email address'),
      searchOrganization: z.string().optional().describe('Filter by organization name'),
      searchFirstName: z.string().optional().describe('Filter by first name'),
      searchLastName: z.string().optional().describe('Filter by last name')
    })
  )
  .output(
    z.object({
      clients: z.array(
        z.object({
          clientId: z.number().describe('Unique client ID'),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          organization: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          currencyCode: z.string().nullable().optional()
        })
      ),
      totalCount: z.number().describe('Total number of matching clients'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.searchEmail) params['search[email]'] = ctx.input.searchEmail;
    if (ctx.input.searchOrganization)
      params['search[organization_like]'] = ctx.input.searchOrganization;
    if (ctx.input.searchFirstName) params['search[fname]'] = ctx.input.searchFirstName;
    if (ctx.input.searchLastName) params['search[lname]'] = ctx.input.searchLastName;

    let result = await client.listClients(params);

    let clients = (result.clients || []).map((c: any) => ({
      clientId: c.id,
      firstName: c.fname,
      lastName: c.lname,
      organization: c.organization,
      email: c.email,
      phone: c.p_phone,
      currencyCode: c.currency_code
    }));

    return {
      output: {
        clients,
        totalCount: result.total || 0,
        currentPage: result.page || 1,
        totalPages: result.pages || 1
      },
      message: `Found **${result.total || 0}** clients (page ${result.page || 1} of ${result.pages || 1}).`
    };
  })
  .build();
