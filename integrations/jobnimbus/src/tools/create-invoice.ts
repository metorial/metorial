import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { financialItemPayload, financialItemSchema } from '../lib/financial-items';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create an invoice in JobNimbus with a related contact or job, a numeric status, line items, and optional customer and internal notes.`
})
  .input(
    z.object({
      parentRecordId: z
        .string()
        .describe('The contact or job ID to associate this invoice with'),
      parentRecordType: z
        .enum(['contact', 'job'])
        .optional()
        .describe('Type of the related record'),
      status: z.number().int().optional().describe('Required numeric invoice status code'),
      items: z.array(financialItemSchema).optional().describe('Required invoice line items'),
      statusName: z.string().optional().describe('Invoice status name'),
      recordTypeName: z.string().optional().describe('Record type name'),
      customerNote: z.string().optional().describe('Customer-facing note'),
      internalNote: z.string().optional().describe('Internal note (not visible to customer)'),
      salesRep: z.string().optional().describe('Sales rep user ID'),
      dateStart: z.number().optional().describe('Start date as Unix timestamp'),
      dateEnd: z.number().optional().describe('End date as Unix timestamp')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Unique JobNimbus ID of the created invoice'),
      number: z.string().optional().describe('Invoice number'),
      statusName: z.string().optional().describe('Invoice status'),
      dateCreated: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.status === undefined || !ctx.input.items?.length) {
      throw createApiServiceError(
        'Provide a numeric status and at least one item to create an invoice.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      type: 'invoice',
      is_active: true,
      status: ctx.input.status,
      related: [{ id: ctx.input.parentRecordId, type: ctx.input.parentRecordType }],
      items: ctx.input.items.map(financialItemPayload)
    };

    if (ctx.input.statusName) data.status_name = ctx.input.statusName;
    if (ctx.input.recordTypeName) data.record_type_name = ctx.input.recordTypeName;
    if (ctx.input.customerNote) data.note = ctx.input.customerNote;
    if (ctx.input.internalNote) data.internal_note = ctx.input.internalNote;
    if (ctx.input.salesRep) data.sales_rep = ctx.input.salesRep;
    if (ctx.input.dateStart !== undefined) data.date_invoice = ctx.input.dateStart;
    if (ctx.input.dateEnd !== undefined) data.date_due = ctx.input.dateEnd;

    let result = await client.createInvoice(data);

    return {
      output: {
        invoiceId: result.jnid,
        number: result.number,
        statusName: result.status_name,
        dateCreated: result.date_created
      },
      message: `Created invoice **${result.number || result.jnid}** for record ${ctx.input.parentRecordId}.`
    };
  })
  .build();
