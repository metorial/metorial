import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  callCenterId: z.string().optional().describe('Call center ID'),
  name: z.string().optional(),
  state: z.string().optional(),
  actionPerformed: z.string(),
  deleted: z.boolean().optional()
});

export let manageCallCenterTool = SlateTool.create(spec, {
  name: 'Manage Call Center',
  key: 'manage_call_center',
  description: `Create, update, or delete a Dialpad call center. Also supports managing operators — adding or removing agents from a call center.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'add_operator', 'remove_operator'])
        .describe('Action to perform'),
      callCenterId: z
        .string()
        .optional()
        .describe(
          'Call center ID (required for update, delete, add_operator, remove_operator)'
        ),
      officeId: z
        .string()
        .optional()
        .describe('Office ID from list_offices (required for create)'),
      name: z.string().optional().describe('Call center name (for create/update)'),
      description: z
        .string()
        .optional()
        .describe('Call center description (for create/update)'),
      operatorUserId: z.number().optional().describe('User ID to add/remove as operator'),
      operatorId: z
        .string()
        .optional()
        .describe(
          'Exact operator user ID from list_resources; the API removes users by user_id, not an operator resource ID.'
        ),
      skillLevel: z
        .number()
        .optional()
        .describe('Skill level for the operator (for add_operator)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'manage_call_center');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
