import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    taxes: z.array(
      z.object({
        taxId: z.number(),
        name: z.string().nullable().optional(),
        amount: z.string().nullable().optional(),
        compound: z.boolean().nullable().optional(),
        number: z.string().nullable().optional()
      })
    ),
    totalCount: z.number(),
    currentPage: z.number(),
    totalPages: z.number()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let listTaxes = SlateTool.create(spec, {
  name: 'List Taxes',
  key: 'list_taxes',
  description: `List all configured tax rates in FreshBooks. Returns tax names, percentages, compound status, and registration numbers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_taxes', ctx, outputSchema))
  .build();
