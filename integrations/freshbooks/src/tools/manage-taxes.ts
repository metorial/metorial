import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    taxId: z.number(),
    name: z.string().nullable().optional(),
    amount: z.string().nullable().optional(),
    compound: z.boolean().nullable().optional(),
    number: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let manageTaxes = SlateTool.create(spec, {
  name: 'Manage Taxes',
  key: 'manage_taxes',
  description: `Create, update, or delete tax configurations in FreshBooks. Taxes can be applied to invoices and line items. Supports compound taxes (calculated on top of primary taxes).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      taxId: z.number().optional().describe('Tax ID (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Tax name (e.g. "GST", "HST", "VAT") - required for create'),
      amount: z.string().optional().describe('Tax percentage as string (e.g. "13")'),
      compound: z
        .boolean()
        .optional()
        .describe('Whether this tax is compound (calculated on top of primary taxes)'),
      number: z.string().optional().describe('Tax registration/submission number')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_taxes', ctx, outputSchema))
  .build();
