import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  blockedNumbers: z
    .array(
      z.object({
        blockedNumberId: z.string().optional(),
        phoneNumber: z.string().optional()
      })
    )
    .optional()
    .describe('List of blocked numbers (for list action)'),
  nextCursor: z.string().optional(),
  success: z.boolean().optional(),
  actionPerformed: z.string()
});

export let manageBlockedNumberTool = SlateTool.create(spec, {
  name: 'Manage Blocked Number',
  key: 'manage_blocked_number',
  description: `List, add, or remove blocked phone numbers at the company level. Blocked numbers are prevented from calling into your Dialpad organization.`
})
  .input(
    z.object({
      action: z.enum(['list', 'block', 'unblock']).describe('Action to perform'),
      phoneNumber: z.string().optional().describe('Phone number to block (for block action)'),
      blockedNumberId: z
        .string()
        .optional()
        .describe(
          'Exact E.164 phone number returned as blockedNumberId by list; the API has no opaque block ID.'
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Exact native pagination cursor for list; number target filters apply only to the returned page'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'manage_blocked_number');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
