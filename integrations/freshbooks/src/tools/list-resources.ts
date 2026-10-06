import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const kinds = z.enum(['estimates', 'credit_notes', 'expense_categories']);
const output = z.object({
  resourceType: kinds,
  resources: z.array(z.record(z.string(), z.unknown())),
  totalCount: z.number(),
  currentPage: z.number(),
  totalPages: z.number()
});
export const listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description:
    'List estimates, credit notes, or expense categories in the selected accounting account with exact IDs and provider pagination. Expense categories supply the categoryId required for expense creation.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...scopeInput,
      resourceType: kinds,
      page: z.number().optional().describe('Page number, starting at 1'),
      perPage: z.number().optional().describe('Results per page, from 1 to 100; default 25')
    })
  )
  .output(output)
  .handleInvocation(ctx => invoke('list_resources', ctx, output))
  .build();
