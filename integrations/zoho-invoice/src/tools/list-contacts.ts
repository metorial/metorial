import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in Zoho Invoice. Supports filtering by name, company, email, phone, and status. Returns paginated results with outstanding receivable information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactName: z.string().optional().describe('Filter by contact display name'),
      companyName: z.string().optional().describe('Filter by company name'),
      email: z.string().optional().describe('Filter by email address'),
      phone: z.string().optional().describe('Filter by phone number'),
      status: z
        .enum(['active', 'inactive', 'crm', 'all'])
        .optional()
        .describe('Filter by contact status'),
      searchText: z
        .string()
        .optional()
        .describe('Search contacts by text across multiple fields'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. "contact_name", "created_time")'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of contacts per page (max 200)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Unique contact ID'),
            contactName: z.string().describe('Display name of the contact'),
            companyName: z.string().optional().describe('Company name'),
            email: z.string().optional().describe('Primary email address'),
            phone: z.string().optional().describe('Phone number'),
            status: z.string().optional().describe('Contact status'),
            outstandingReceivableAmount: z
              .number()
              .optional()
              .describe('Outstanding receivable amount'),
            createdTime: z
              .string()
              .optional()
              .describe('ISO timestamp when the contact was created')
          })
        )
        .describe('Array of contacts matching the query'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of results per page'),
      hasMorePages: z.boolean().describe('Whether additional pages of results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let params: Record<string, any> = {};
    if (ctx.input.contactName !== undefined) params.contact_name = ctx.input.contactName;
    if (ctx.input.companyName !== undefined) params.company_name = ctx.input.companyName;
    if (ctx.input.email !== undefined) params.email = ctx.input.email;
    if (ctx.input.phone !== undefined) params.phone = ctx.input.phone;
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.searchText !== undefined) params.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn !== undefined) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listContacts(params);

    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: c.contact_id,
      contactName: c.contact_name,
      companyName: c.company_name,
      email: c.email,
      phone: c.phone,
      status: c.status,
      outstandingReceivableAmount: c.outstanding_receivable_amount,
      createdTime: c.created_time
    }));

    let pageContext = result.pageContext || {};

    return {
      output: {
        contacts,
        page: pageContext.page || 1,
        perPage: pageContext.per_page || 25,
        hasMorePages: pageContext.has_more_page || false
      },
      message: `Found **${contacts.length}** contact(s) (page ${pageContext.page || 1}).${pageContext.has_more_page ? ' More pages available.' : ''}`
    };
  })
  .build();
