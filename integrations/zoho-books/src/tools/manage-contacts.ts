import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let contactOutputSchema = z.object({
  contactId: z.string(),
  contactName: z.string(),
  companyName: z.string().optional(),
  contactType: z.string().optional(),
  status: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  outstandingReceivableAmount: z.number().optional(),
  outstandingPayableAmount: z.number().optional(),
  currencyCode: z.string().optional(),
  createdTime: z.string().optional()
});

let mapContact = (c: any) => ({
  contactId: c.contact_id,
  contactName: c.contact_name,
  companyName: c.company_name,
  contactType: c.contact_type,
  status: c.status,
  email: c.email,
  phone: c.phone,
  outstandingReceivableAmount: c.outstanding_receivable_amount,
  outstandingPayableAmount: c.outstanding_payable_amount,
  currencyCode: c.currency_code,
  createdTime: c.created_time
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list customers and vendors. Supports filtering by contact type, name, email, status, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactType: z
        .enum(['customer', 'vendor'])
        .optional()
        .describe('Filter by contact type'),
      searchText: z.string().optional().describe('Search by contact name, company, email'),
      status: z
        .enum(['active', 'inactive', 'duplicate', 'crm'])
        .optional()
        .describe('Filter by contact status'),
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(200).describe('Records per page (max 200)'),
      sortColumn: z
        .enum([
          'contact_name',
          'company_name',
          'first_name',
          'last_name',
          'email',
          'outstanding_receivable_amount',
          'created_time'
        ])
        .optional()
        .describe('Column to sort by'),
      sortOrder: z.enum(['ascending', 'descending']).optional().describe('Sort direction'),
      filterBy: z
        .enum([
          'Status.All',
          'Status.Active',
          'Status.Inactive',
          'Status.Duplicate',
          'Status.CRM'
        ])
        .optional()
        .describe('Predefined filter')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};

    if (ctx.input.contactType) params.contact_type = ctx.input.contactType;
    if (ctx.input.searchText) params.search_text = ctx.input.searchText;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.sortColumn) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.sortOrder) params.sort_order = ctx.input.sortOrder;
    if (ctx.input.filterBy) params.filter_by = ctx.input.filterBy;

    let result = await client.listContacts(params);

    let contacts = (result.contacts || []).map(mapContact);
    let pageContext = result.page_context
      ? {
          page: result.page_context.page,
          perPage: result.page_context.per_page,
          hasMorePage: result.page_context.has_more_page
        }
      : undefined;

    let page = ctx.input.page || 1;

    return {
      output: { contacts, pageContext },
      message: `Found **${contacts.length}** contact(s) on page ${page}.`
    };
  })
  .build();
