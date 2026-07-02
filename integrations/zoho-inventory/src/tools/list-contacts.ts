import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List customer and vendor contacts with optional filtering by type, search, and status. Returns contact summaries with outstanding balances.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Number of contacts per page (max 200)'),
      contactType: z
        .enum(['customer', 'vendor'])
        .optional()
        .describe('Filter by contact type'),
      searchText: z.string().optional().describe('Search by contact name, company, or email'),
      filterBy: z
        .enum([
          'Status.All',
          'Status.Active',
          'Status.Inactive',
          'Status.Crm',
          'Status.Duplicate'
        ])
        .optional()
        .describe('Filter contacts by status'),
      sortColumn: z
        .enum(['contact_name', 'company_name', 'created_time'])
        .optional()
        .describe('Column to sort by'),
      sortOrder: z.enum(['ascending', 'descending']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Contact ID'),
          contactName: z.string().describe('Contact name'),
          contactType: z.string().optional().describe('Contact type'),
          companyName: z.string().optional().describe('Company name'),
          email: z.string().optional().describe('Email'),
          phone: z.string().optional().describe('Phone'),
          status: z.string().optional().describe('Status'),
          outstandingPayable: z.number().optional().describe('Outstanding payable'),
          outstandingReceivable: z.number().optional().describe('Outstanding receivable')
        })
      ),
      hasMorePages: z.boolean().describe('Whether more pages are available'),
      totalCount: z.number().optional().describe('Total number of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listContacts({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      contact_type: ctx.input.contactType,
      search_text: ctx.input.searchText,
      filter_by: ctx.input.filterBy,
      sort_column: ctx.input.sortColumn,
      sort_order: ctx.input.sortOrder
    });

    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: String(c.contact_id),
      contactName: c.contact_name,
      contactType: c.contact_type ?? undefined,
      companyName: c.company_name ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      status: c.status ?? undefined,
      outstandingPayable: c.outstanding_payable_amount ?? undefined,
      outstandingReceivable: c.outstanding_receivable_amount ?? undefined
    }));

    let pageContext = result.page_context || {};

    return {
      output: {
        contacts,
        hasMorePages: pageContext.has_more_page ?? false,
        totalCount: pageContext.total ?? undefined
      },
      message: `Found **${contacts.length}** contacts${pageContext.total ? ` (${pageContext.total} total)` : ''}.`
    };
  })
  .build();
