import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  lineItemId: z
    .number()
    .optional()
    .describe('Line item ID (required when updating existing items)'),
  kind: z.string().optional().describe('Kind of line item (e.g. "Service", "Product")'),
  description: z.string().optional().describe('Description of the line item'),
  quantity: z.number().optional().describe('Quantity'),
  unitPrice: z.number().optional().describe('Unit price'),
  projectId: z.number().optional().describe('Project ID to associate'),
  taxed: z.boolean().optional().describe('Whether subject to first tax rate'),
  taxed2: z.boolean().optional().describe('Whether subject to second tax rate'),
  destroy: z
    .boolean()
    .optional()
    .describe('Set to true to remove this line item (update only)')
});

export let manageInvoice = SlateTool.create(spec, {
  name: 'Manage Invoice',
  key: 'manage_invoice',
  description: `Create, update, or delete an invoice in Harvest. Invoices can include line items for services and products, and can be associated with clients and projects. Supports tax, discount, and payment terms configuration.`,
  instructions: [
    'When updating line items, include **lineItemId** for existing items. To add new items, omit lineItemId. To remove items, set **destroy** to true.',
    'Valid **paymentTerm** values: "upon receipt", "net 15", "net 30", "net 45", "net 60", "custom".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      invoiceId: z.number().optional().describe('Invoice ID (required for update/delete)'),
      clientId: z.number().optional().describe('Client ID (required for create)'),
      number: z.string().optional().describe('Invoice number'),
      purchaseOrder: z.string().optional().describe('Purchase order number'),
      tax: z.number().optional().describe('Tax percentage (first)'),
      tax2: z.number().optional().describe('Tax percentage (second)'),
      discount: z.number().optional().describe('Discount percentage'),
      subject: z.string().optional().describe('Invoice subject'),
      notes: z.string().optional().describe('Invoice notes'),
      currency: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      paymentTerm: z.string().optional().describe('Payment term'),
      lineItems: z.array(lineItemSchema).optional().describe('Line items for the invoice')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().optional().describe('ID of the invoice'),
      clientName: z.string().optional().describe('Client name'),
      number: z.string().optional().nullable().describe('Invoice number'),
      amount: z.number().optional().describe('Total amount'),
      dueAmount: z.number().optional().describe('Amount due'),
      state: z.string().optional().describe('Invoice state (draft, open, paid, closed)'),
      issueDate: z.string().optional().nullable().describe('Issue date'),
      dueDate: z.string().optional().nullable().describe('Due date'),
      deleted: z.boolean().optional().describe('Whether the invoice was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.invoiceId) throw new Error('invoiceId is required for delete');
      await client.deleteInvoice(ctx.input.invoiceId);
      return {
        output: { invoiceId: ctx.input.invoiceId, deleted: true },
        message: `Deleted invoice **#${ctx.input.invoiceId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.clientId) throw new Error('clientId is required for create');
      let createLineItems = ctx.input.lineItems?.map(li => ({
        kind: li.kind!,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        projectId: li.projectId,
        taxed: li.taxed,
        taxed2: li.taxed2
      }));
      let inv = await client.createInvoice({
        clientId: ctx.input.clientId,
        number: ctx.input.number,
        purchaseOrder: ctx.input.purchaseOrder,
        tax: ctx.input.tax,
        tax2: ctx.input.tax2,
        discount: ctx.input.discount,
        subject: ctx.input.subject,
        notes: ctx.input.notes,
        currency: ctx.input.currency,
        issueDate: ctx.input.issueDate,
        dueDate: ctx.input.dueDate,
        paymentTerm: ctx.input.paymentTerm,
        lineItems: createLineItems
      });
      return {
        output: {
          invoiceId: inv.id,
          clientName: inv.client?.name,
          number: inv.number,
          amount: inv.amount,
          dueAmount: inv.due_amount,
          state: inv.state,
          issueDate: inv.issue_date,
          dueDate: inv.due_date
        },
        message: `Created invoice **#${inv.number ?? inv.id}** for ${inv.amount} (${inv.state}).`
      };
    }

    // update
    if (!ctx.input.invoiceId) throw new Error('invoiceId is required for update');
    let inv = await client.updateInvoice(ctx.input.invoiceId, {
      clientId: ctx.input.clientId,
      number: ctx.input.number,
      purchaseOrder: ctx.input.purchaseOrder,
      tax: ctx.input.tax,
      tax2: ctx.input.tax2,
      discount: ctx.input.discount,
      subject: ctx.input.subject,
      notes: ctx.input.notes,
      currency: ctx.input.currency,
      issueDate: ctx.input.issueDate,
      dueDate: ctx.input.dueDate,
      paymentTerm: ctx.input.paymentTerm,
      lineItems: ctx.input.lineItems
    });
    return {
      output: {
        invoiceId: inv.id,
        clientName: inv.client?.name,
        number: inv.number,
        amount: inv.amount,
        dueAmount: inv.due_amount,
        state: inv.state,
        issueDate: inv.issue_date,
        dueDate: inv.due_date
      },
      message: `Updated invoice **#${inv.number ?? inv.id}** — ${inv.amount} (${inv.state}).`
    };
  })
  .build();
