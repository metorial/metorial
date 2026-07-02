import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve detailed information about a specific invoice by its ID. Returns full invoice data including line items, amounts, status, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The invoice ID to retrieve')
    })
  )
  .output(
    z.object({
      invoiceId: z.number(),
      invoiceNumber: z.string().nullable().optional(),
      customerId: z.number().nullable().optional(),
      status: z.number().nullable().optional(),
      amount: z.any().optional(),
      outstandingAmount: z.any().optional(),
      currencyCode: z.string().nullable().optional(),
      createDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      dueOffsetDays: z.number().nullable().optional(),
      discountValue: z.string().nullable().optional(),
      terms: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      poNumber: z.string().nullable().optional(),
      lines: z
        .array(
          z.object({
            lineId: z.number().optional(),
            name: z.string().nullable().optional(),
            qty: z.number().nullable().optional(),
            unitCost: z.any().optional(),
            amount: z.any().optional(),
            taxName1: z.string().nullable().optional(),
            taxAmount1: z.number().nullable().optional(),
            taxName2: z.string().nullable().optional(),
            taxAmount2: z.number().nullable().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let result = await client.getInvoice(ctx.input.invoiceId);

    let lines = (result.lines || []).map((line: any) => ({
      lineId: line.lineid,
      name: line.name,
      qty: line.qty,
      unitCost: line.unit_cost,
      amount: line.amount,
      taxName1: line.taxName1,
      taxAmount1: line.taxAmount1,
      taxName2: line.taxName2,
      taxAmount2: line.taxAmount2
    }));

    return {
      output: {
        invoiceId: result.id || result.invoiceid,
        invoiceNumber: result.invoice_number,
        customerId: result.customerid,
        status: result.status,
        amount: result.amount,
        outstandingAmount: result.outstanding,
        currencyCode: result.currency_code,
        createDate: result.create_date,
        dueDate: result.due_date,
        dueOffsetDays: result.due_offset_days,
        discountValue: result.discount_value,
        terms: result.terms,
        notes: result.notes,
        poNumber: result.po_number,
        lines
      },
      message: `Retrieved invoice **#${result.invoice_number}** (ID: ${result.id || result.invoiceid}) - status: ${result.status}.`
    };
  })
  .build();
