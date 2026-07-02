import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoBooksClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let booksGetInvoices = SlateTool.create(spec, {
  name: 'Books Get Invoices',
  key: 'books_get_invoices',
  description: `List or retrieve invoices from Zoho Books. Supports filtering by status, customer, and pagination. Can also list organizations to find the organization ID needed for all Books operations.`,
  instructions: [
    'The organizationId is required. Use listOrganizations=true to discover available organizations.',
    'Provide invoiceId to fetch a single invoice with full details.',
    'Filter by status: "sent", "draft", "overdue", "paid", "void", "unpaid", "partially_paid".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Zoho Books organization ID (required unless listing organizations)'),
      invoiceId: z.string().optional().describe('Specific invoice ID to fetch'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., "sent", "draft", "overdue", "paid", "void")'),
      customerId: z.string().optional().describe('Filter invoices by customer ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Records per page (max 200)'),
      sortColumn: z
        .string()
        .optional()
        .describe('Sort by column (e.g., "date", "invoice_number", "total")'),
      sortOrder: z.enum(['ascending', 'descending']).optional().describe('Sort order'),
      listOrganizations: z
        .boolean()
        .optional()
        .describe('If true, lists available organizations instead of invoices')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.any())).optional().describe('Invoice records'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string(),
            name: z.string(),
            isDefault: z.boolean().optional(),
            currencyCode: z.string().optional()
          })
        )
        .optional()
        .describe('Available organizations (if listOrganizations is true)'),
      hasMorePages: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;

    if (ctx.input.listOrganizations) {
      let result = await ZohoBooksClient.listOrganizations(ctx.auth.token, dc);
      let orgs = (result?.organizations || []).map((o: any) => ({
        organizationId: o.organization_id,
        name: o.name,
        isDefault: o.is_default_org,
        currencyCode: o.currency_code
      }));
      return {
        output: { organizations: orgs },
        message: `Found **${orgs.length}** Zoho Books organizations.`
      };
    }

    if (!ctx.input.organizationId) throw zohoServiceError('organizationId is required');
    let client = new ZohoBooksClient({
      token: ctx.auth.token,
      datacenter: dc,
      organizationId: ctx.input.organizationId
    });

    if (ctx.input.invoiceId) {
      let result = await client.getInvoice(ctx.input.invoiceId);
      return {
        output: { invoices: [result?.invoice || result] },
        message: `Fetched invoice **${result?.invoice?.invoice_number || ctx.input.invoiceId}**.`
      };
    }

    let result = await client.listInvoices({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      status: ctx.input.status,
      customerId: ctx.input.customerId,
      sortColumn: ctx.input.sortColumn,
      sortOrder: ctx.input.sortOrder
    });

    let invoices = result?.invoices || [];
    let pageContext = result?.page_context;
    return {
      output: {
        invoices,
        hasMorePages: pageContext?.has_more_page ?? false
      },
      message: `Retrieved **${invoices.length}** invoices.`
    };
  })
  .build();
