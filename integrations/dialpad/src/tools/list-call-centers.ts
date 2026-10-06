import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  callCenters: z.array(
    z.object({
      callCenterId: z.string().describe('Call center ID'),
      name: z.string().optional(),
      description: z.string().optional(),
      officeId: z.string().optional(),
      state: z.string().optional().describe('Call center state (active, deleted, pending)'),
      dateCreated: z.string().optional()
    })
  ),
  nextCursor: z.string().optional()
});

export let listCallCentersTool = SlateTool.create(spec, {
  name: 'List Call Centers',
  key: 'list_call_centers',
  description: `List call centers for a specific office in your Dialpad account. Returns call center details including name, state, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      officeId: z
        .string()
        .describe('Office ID returned by list_offices to list call centers for'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'list_call_centers');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
