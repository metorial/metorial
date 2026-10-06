import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const kinds = z.enum([
  'payments',
  'expenses',
  'estimates',
  'projects',
  'time_entries',
  'taxes',
  'items'
]);
const output = z.object({
  resourceType: kinds,
  resourceId: z.number(),
  resource: z.record(z.string(), z.unknown())
});
export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read one payment, expense, estimate, project, time entry, tax, or billable item by its exact ID in the selected authorized account/business. Returns the exact identifiers and provider state needed for follow-up work.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...scopeInput,
      resourceType: kinds,
      resourceId: z.number().describe('Exact resource ID from a create or list response')
    })
  )
  .output(output)
  .handleInvocation(ctx => invoke('get_resource', ctx, output))
  .build();
