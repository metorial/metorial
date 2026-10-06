import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
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
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

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
      ...scopeInput,
      invoiceId: z.number().describe('The invoice ID to retrieve')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('get_invoice', ctx, outputSchema))
  .build();
