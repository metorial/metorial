import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    expenseId: z.number(),
    amount: z.any().optional(),
    currencyCode: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    categoryId: z.number().nullable().optional(),
    vendorName: z.string().nullable().optional(),
    clientId: z.number().nullable().optional(),
    projectId: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z
      .number()
      .nullable()
      .optional()
      .describe('Expense status (0=internal, 1=outstanding, 2=invoiced, 4=recouped)')
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageExpenses = SlateTool.create(spec, {
  name: 'Manage Expenses',
  key: 'manage_expenses',
  description: `Create, update, or delete expenses in FreshBooks. Track business expenses with amounts, categories, vendors, taxes, and optional project associations.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      expenseId: z.number().optional().describe('Expense ID (required for update/delete)'),
      amount: z.string().optional().describe('Expense amount (e.g. "50.00")'),
      currencyCode: z.string().optional().describe('Three-letter currency code'),
      date: z.string().optional().describe('Expense date (YYYY-MM-DD)'),
      categoryId: z.number().optional().describe('Expense category ID'),
      vendorName: z.string().optional().describe('Vendor/merchant name'),
      clientId: z.number().optional().describe('Client ID to associate expense with'),
      projectId: z.number().optional().describe('Project ID to associate expense with'),
      notes: z.string().optional().describe('Expense notes'),
      taxName1: z.string().optional().describe('First tax name'),
      taxPercent1: z.string().optional().describe('First tax percentage'),
      taxName2: z.string().optional().describe('Second tax name'),
      taxPercent2: z.string().optional().describe('Second tax percentage')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_expenses', ctx, outputSchema))
  .build();
