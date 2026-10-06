import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    items: z.array(
      z.object({
        itemId: z.number(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        unitCost: z.any().optional(),
        inventory: z.string().nullable().optional(),
        sku: z.string().nullable().optional()
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

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List billable items in FreshBooks. Returns reusable product/service records with names, descriptions, and rates.`,
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
  .handleInvocation(async ctx => invoke('list_items', ctx, outputSchema))
  .build();
