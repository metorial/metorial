import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let recurringInvoiceSchema = z.object({
  recurringInvoiceId: z.string(),
  contactId: z.string().nullable(),
  active: z.boolean(),
  frequency: z.number().nullable(),
  frequencyType: z.string().nullable(),
  startDate: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  lastDate: z.string().nullable(),
  autoSend: z.boolean(),
  currency: z.string().nullable(),
  totalPriceInclTax: z.string().nullable(),
  totalPriceExclTax: z.string().nullable(),
  reference: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export let manageRecurringInvoices = SlateTool.create(spec, {
  name: 'Manage Recurring Invoices',
  key: 'manage_recurring_invoices',
  description: `List, get, create, update, or delete recurring sales invoices. Recurring invoices automatically generate new invoices at configured intervals.`,
  instructions: [
    'frequencyType options: day, week, month, quarter, year.',
    'Recurring invoices with existing generated invoices will be deactivated instead of deleted.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      recurringInvoiceId: z
        .string()
        .optional()
        .describe('Recurring invoice ID (for get, update, delete)'),
      contactId: z.string().optional().describe('Contact ID (for create)'),
      invoiceDate: z
        .string()
        .optional()
        .describe('Next invoice date YYYY-MM-DD (for create/update)'),
      frequencyType: z
        .enum(['day', 'week', 'month', 'quarter', 'year'])
        .optional()
        .describe('Recurrence interval type (for create/update)'),
      frequency: z
        .number()
        .optional()
        .describe('Recurrence frequency count (for create/update)'),
      autoSend: z
        .boolean()
        .optional()
        .describe('Auto-send generated invoices (for create/update)'),
      currency: z.string().optional().describe('ISO currency code (for create)'),
      reference: z.string().optional().describe('Custom reference (for create/update)'),
      hasDesiredCount: z
        .boolean()
        .optional()
        .describe('Whether to limit the number of invoices generated'),
      desiredCount: z
        .number()
        .optional()
        .describe('Number of invoices to generate before deactivating'),
      workflowId: z.string().optional().describe('Workflow ID (for create/update)'),
      lineItems: z
        .array(
          z.object({
            description: z.string().optional(),
            amount: z.string().optional(),
            price: z.string().optional(),
            taxRateId: z.string().optional(),
            ledgerAccountId: z.string().optional(),
            productId: z.string().optional()
          })
        )
        .optional()
        .describe('Line items (for create/update)'),
      filter: z.string().optional().describe('Filter for list'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      recurringInvoice: recurringInvoiceSchema.optional(),
      recurringInvoices: z.array(recurringInvoiceSchema).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let mapInvoice = (r: any) => ({
      recurringInvoiceId: String(r.id),
      contactId: r.contact_id ? String(r.contact_id) : null,
      active: r.active ?? false,
      frequency: r.frequency ?? null,
      frequencyType: r.frequency_type || null,
      startDate: r.start_date || null,
      invoiceDate: r.invoice_date || null,
      lastDate: r.last_date || null,
      autoSend: r.auto_send ?? false,
      currency: r.currency || null,
      totalPriceInclTax: r.total_price_incl_tax || null,
      totalPriceExclTax: r.total_price_excl_tax || null,
      reference: r.reference || null,
      createdAt: r.created_at || null,
      updatedAt: r.updated_at || null
    });

    switch (ctx.input.action) {
      case 'list': {
        let invoices = await client.listRecurringSalesInvoices({
          filter: ctx.input.filter,
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let mapped = invoices.map(mapInvoice);
        return {
          output: { recurringInvoices: mapped },
          message: `Found ${mapped.length} recurring invoice(s).`
        };
      }
      case 'get': {
        if (!ctx.input.recurringInvoiceId)
          throw new Error('recurringInvoiceId is required for get');
        let invoice = await client.getRecurringSalesInvoice(ctx.input.recurringInvoiceId);
        return {
          output: { recurringInvoice: mapInvoice(invoice) },
          message: `Retrieved recurring invoice ${invoice.id}.`
        };
      }
      case 'create': {
        let data: Record<string, any> = {};
        if (ctx.input.contactId) data.contact_id = ctx.input.contactId;
        if (ctx.input.invoiceDate) data.invoice_date = ctx.input.invoiceDate;
        if (ctx.input.frequencyType) data.frequency_type = ctx.input.frequencyType;
        if (ctx.input.frequency !== undefined) data.frequency = ctx.input.frequency;
        if (ctx.input.autoSend !== undefined) data.auto_send = ctx.input.autoSend;
        if (ctx.input.currency) data.currency = ctx.input.currency;
        if (ctx.input.reference) data.reference = ctx.input.reference;
        if (ctx.input.hasDesiredCount !== undefined)
          data.has_desired_count = ctx.input.hasDesiredCount;
        if (ctx.input.desiredCount !== undefined) data.desired_count = ctx.input.desiredCount;
        if (ctx.input.workflowId) data.workflow_id = ctx.input.workflowId;
        if (ctx.input.lineItems) {
          data.details_attributes = ctx.input.lineItems.map((item, i) => {
            let detail: Record<string, any> = {};
            if (item.description) detail.description = item.description;
            if (item.amount) detail.amount = item.amount;
            if (item.price) detail.price = item.price;
            if (item.taxRateId) detail.tax_rate_id = item.taxRateId;
            if (item.ledgerAccountId) detail.ledger_account_id = item.ledgerAccountId;
            if (item.productId) detail.product_id = item.productId;
            detail.row_order = i + 1;
            return detail;
          });
        }
        let invoice = await client.createRecurringSalesInvoice(data);
        return {
          output: { recurringInvoice: mapInvoice(invoice) },
          message: `Created recurring invoice with ${ctx.input.frequencyType || 'month'} frequency.`
        };
      }
      case 'update': {
        if (!ctx.input.recurringInvoiceId)
          throw new Error('recurringInvoiceId is required for update');
        let data: Record<string, any> = {};
        if (ctx.input.invoiceDate !== undefined) data.invoice_date = ctx.input.invoiceDate;
        if (ctx.input.frequencyType !== undefined)
          data.frequency_type = ctx.input.frequencyType;
        if (ctx.input.frequency !== undefined) data.frequency = ctx.input.frequency;
        if (ctx.input.autoSend !== undefined) data.auto_send = ctx.input.autoSend;
        if (ctx.input.reference !== undefined) data.reference = ctx.input.reference;
        if (ctx.input.hasDesiredCount !== undefined)
          data.has_desired_count = ctx.input.hasDesiredCount;
        if (ctx.input.desiredCount !== undefined) data.desired_count = ctx.input.desiredCount;
        if (ctx.input.workflowId !== undefined) data.workflow_id = ctx.input.workflowId;
        let invoice = await client.updateRecurringSalesInvoice(
          ctx.input.recurringInvoiceId,
          data
        );
        return {
          output: { recurringInvoice: mapInvoice(invoice) },
          message: `Updated recurring invoice ${ctx.input.recurringInvoiceId}.`
        };
      }
      case 'delete': {
        if (!ctx.input.recurringInvoiceId)
          throw new Error('recurringInvoiceId is required for delete');
        await client.deleteRecurringSalesInvoice(ctx.input.recurringInvoiceId);
        return {
          output: { deleted: true },
          message: `Deleted/deactivated recurring invoice ${ctx.input.recurringInvoiceId}.`
        };
      }
    }
  });
