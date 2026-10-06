import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  numbers: z
    .array(
      z.object({
        phoneNumber: z.string().optional(),
        targetType: z.string().optional(),
        targetId: z.string().optional()
      })
    )
    .optional()
    .describe('List of phone numbers (for list action)'),
  nextCursor: z.string().optional(),
  success: z.boolean().optional().describe('Whether the assign/unassign was successful'),
  actionPerformed: z.string()
});

export let managePhoneNumberTool = SlateTool.create(spec, {
  name: 'Manage Phone Number',
  key: 'manage_phone_number',
  description: `List, assign, or unassign Dialpad phone numbers. Numbers can be assigned to users, offices, rooms, or call routers.`
})
  .input(
    z.object({
      action: z.enum(['list', 'assign', 'unassign']).describe('Action to perform'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number (E.164 format) for assign/unassign'),
      targetType: z
        .enum(['user', 'office', 'room', 'call_router'])
        .optional()
        .describe('Target type for the number'),
      targetId: z
        .string()
        .optional()
        .describe(
          'Exact target ID from list_users or list_offices; for rooms/call routers obtain the ID in Dialpad administration'
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
    const result = await invoke(ctx, 'manage_phone_number');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
