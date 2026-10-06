import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  resourceType: z.string(),
  resource: z.record(z.string(), z.unknown())
});
export const getResourceTool = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read one exact call, contact, office, call center, phone number or API-managed block. Discover identifiers with the corresponding list tool first.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum([
        'call',
        'contact',
        'office',
        'call_center',
        'phone_number',
        'blocked_number'
      ]),
      resourceId: z
        .string()
        .describe(
          'Exact ID from list_calls, list_contacts, list_offices or list_call_centers; use the E.164 phone number from manage_phone_number or manage_blocked_number for number selectors.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'get_resource');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
