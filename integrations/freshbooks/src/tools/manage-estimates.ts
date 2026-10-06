import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

let lineItemSchema = z.object({
  name: z.string().describe('Line item description'),
  qty: z.number().describe('Quantity'),
  unitCost: z.string().describe('Unit cost amount (e.g. "100.00")'),
  taxName1: z.string().optional().describe('First tax name'),
  taxAmount1: z.string().optional().describe('First tax percentage'),
  taxName2: z.string().optional().describe('Second tax name'),
  taxAmount2: z.string().optional().describe('Second tax percentage')
});

const outputSchema = z
  .object({
    estimateId: z.number(),
    estimateNumber: z.string().nullable().optional(),
    customerId: z.number().nullable().optional(),
    status: z.number().nullable().optional(),
    amount: z.any().optional(),
    currencyCode: z.string().nullable().optional(),
    createDate: z.string().nullable().optional()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageEstimates = SlateTool.create(spec, {
  name: 'Manage Estimates',
  key: 'manage_estimates',
  description: `Create, update, delete, or send estimates in FreshBooks. Estimates allow clients to review and agree on price and scope before work begins. Estimate email delivery is currently unavailable through this tool; use FreshBooks to send an estimate.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete', 'send']).describe('Action to perform'),
      estimateId: z
        .number()
        .optional()
        .describe('Estimate ID (required for update/delete/send)'),
      customerId: z.number().optional().describe('Client ID (required for create)'),
      createDate: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      currencyCode: z.string().optional().describe('Three-letter currency code'),
      estimateNumber: z.string().optional().describe('Custom estimate number'),
      poNumber: z.string().optional().describe('Purchase order number'),
      discountValue: z.string().optional().describe('Discount percentage (0-100)'),
      terms: z.string().optional().describe('Terms text'),
      notes: z.string().optional().describe('Additional notes'),
      lines: z.array(lineItemSchema).optional().describe('Line items'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses for sending (required for "send" action)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_estimates', ctx, outputSchema))
  .build();
