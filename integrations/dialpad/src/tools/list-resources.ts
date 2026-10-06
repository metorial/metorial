import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  resourceType: z.literal('call_center_operators'),
  callCenterId: z.string(),
  users: z.array(z.object({ userId: z.string() }).passthrough()).optional(),
  rooms: z.array(z.object({ roomId: z.string() }).passthrough()).optional()
});
export const listResourcesTool = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description:
    'Discover native user and room operators for an exact call center. Read call-center IDs with list_call_centers first; user and room collections remain separate.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.literal('call_center_operators'),
      callCenterId: z
        .string()
        .describe(
          'Exact call-center ID returned by list_call_centers; list_offices supplies its office ID.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'list_resources');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
