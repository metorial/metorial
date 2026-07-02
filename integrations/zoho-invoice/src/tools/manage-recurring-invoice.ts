import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRecurringInvoice = SlateTool.create(spec, {
  name: 'Manage Recurring Invoice',
  key: 'manage_recurring_invoice',
  description: `Creates or updates a recurring invoice in Zoho Invoice. If recurringInvoiceId is provided, the existing recurring invoice is updated; otherwise a new one is created. Recurring invoices automatically generate invoices on a set schedule.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recurringInvoiceId: z
        .string()
        .optional()
        .describe(
          'ID of the recurring invoice to update. If omitted, a new recurring invoice is created.'
        ),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID for the recurring invoice (required when creating)'),
      recurrenceName: z
        .string()
        .optional()
        .describe('Name for the recurring invoice profile (required when creating)'),
      recurrenceFrequency: z
        .enum([
          'weekly',
          'biweekly',
          'monthly',
          'bimonthly',
          'quarterly',
          'half_yearly',
          'yearly',
          'every_2_years'
        ])
        .optional()
        .describe('How often the invoice recurs (required when creating)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for recurrence in yyyy-mm-dd format'),
      endDate: z.string().optional().describe('End date for recurrence in yyyy-mm-dd format'),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional().describe('ID of an existing item'),
            name: z.string().optional().describe('Name of the line item'),
            description: z.string().optional().describe('Description of the line item'),
            rate: z.number().optional().describe('Rate per unit'),
            quantity: z.number().optional().describe('Quantity of the line item'),
            unit: z.string().optional().describe('Unit of measurement'),
            taxId: z.string().optional().describe('Tax ID to apply to this line item'),
            discount: z
              .union([z.string(), z.number()])
              .optional()
              .describe('Discount amount or percentage for this line item')
          })
        )
        .optional()
        .describe('Array of line items for the recurring invoice'),
      paymentTerms: z.number().optional().describe('Payment terms in days (e.g. 15, 30, 60)'),
      discount: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Discount to apply to the invoice total'),
      discountType: z
        .enum(['entity_level', 'item_level'])
        .optional()
        .describe('Whether the discount applies at the entity or item level')
    })
  )
  .output(
    z.object({
      recurringInvoiceId: z.string().describe('Unique ID of the recurring invoice'),
      recurrenceName: z.string().optional().describe('Name of the recurring invoice profile'),
      status: z.string().optional().describe('Current status of the recurring invoice'),
      customerId: z.string().optional().describe('Associated customer ID'),
      customerName: z.string().optional().describe('Associated customer name'),
      recurrenceFrequency: z.string().optional().describe('Recurrence frequency'),
      startDate: z.string().optional().describe('Start date of the recurrence'),
      endDate: z.string().optional().describe('End date of the recurrence'),
      nextInvoiceDate: z
        .string()
        .optional()
        .describe('Date when the next invoice will be generated'),
      total: z.number().optional().describe('Total amount of the recurring invoice'),
      createdTime: z
        .string()
        .optional()
        .describe('Timestamp when the recurring invoice was created'),
      lastModifiedTime: z
        .string()
        .optional()
        .describe('Timestamp when the recurring invoice was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let payload: Record<string, any> = {};

    if (ctx.input.customerId) payload.customer_id = ctx.input.customerId;
    if (ctx.input.recurrenceName) payload.recurrence_name = ctx.input.recurrenceName;
    if (ctx.input.recurrenceFrequency)
      payload.recurrence_frequency = ctx.input.recurrenceFrequency;
    if (ctx.input.startDate) payload.start_date = ctx.input.startDate;
    if (ctx.input.endDate) payload.end_date = ctx.input.endDate;
    if (ctx.input.paymentTerms !== undefined) payload.payment_terms = ctx.input.paymentTerms;
    if (ctx.input.discount !== undefined) payload.discount = ctx.input.discount;
    if (ctx.input.discountType) payload.discount_type = ctx.input.discountType;

    if (ctx.input.lineItems) {
      payload.line_items = ctx.input.lineItems.map(li => {
        let item: Record<string, any> = {};
        if (li.itemId) item.item_id = li.itemId;
        if (li.name) item.name = li.name;
        if (li.description) item.description = li.description;
        if (li.rate !== undefined) item.rate = li.rate;
        if (li.quantity !== undefined) item.quantity = li.quantity;
        if (li.unit) item.unit = li.unit;
        if (li.taxId) item.tax_id = li.taxId;
        if (li.discount !== undefined) item.discount = li.discount;
        return item;
      });
    }

    let invoice: any;

    if (ctx.input.recurringInvoiceId) {
      invoice = await client.updateRecurringInvoice(ctx.input.recurringInvoiceId, payload);
    } else {
      invoice = await client.createRecurringInvoice(payload);
    }

    let output = {
      recurringInvoiceId: invoice.recurring_invoice_id,
      recurrenceName: invoice.recurrence_name,
      status: invoice.status,
      customerId: invoice.customer_id,
      customerName: invoice.customer_name,
      recurrenceFrequency: invoice.recurrence_frequency,
      startDate: invoice.start_date,
      endDate: invoice.end_date,
      nextInvoiceDate: invoice.next_invoice_date,
      total: invoice.total,
      createdTime: invoice.created_time,
      lastModifiedTime: invoice.last_modified_time
    };

    let action = ctx.input.recurringInvoiceId ? 'Updated' : 'Created';

    return {
      output,
      message: `${action} recurring invoice **${output.recurrenceName}** (${output.recurringInvoiceId}) with ${output.recurrenceFrequency} recurrence.`
    };
  })
  .build();
