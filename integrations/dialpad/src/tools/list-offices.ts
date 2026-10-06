import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  offices: z.array(
    z.object({
      officeId: z.string().describe('Office ID'),
      name: z.string().optional(),
      companyId: z.string().optional(),
      timezone: z.string().optional(),
      country: z.string().optional()
    })
  ),
  nextCursor: z.string().optional()
});

export let listOfficesTool = SlateTool.create(spec, {
  name: 'List Offices',
  key: 'list_offices',
  description: `List all offices accessible with your API key. Returns office details including native office ID, name, timezone and country when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'list_offices');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
