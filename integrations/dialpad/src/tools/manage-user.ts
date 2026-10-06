import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  userId: z.string().describe('User ID'),
  displayName: z.string().optional(),
  email: z.string().optional(),
  state: z.string().optional(),
  deleted: z.boolean().optional().describe('True if the user was deleted')
});

export let manageUserTool = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a Dialpad user. Use this to provision new users, modify user settings (name, DND, office), or remove users from the company.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      userId: z.string().optional().describe('User ID (required for update and delete)'),
      email: z
        .string()
        .optional()
        .describe(
          'Email address required for create; update replaces the user email list with this address'
        ),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      officeId: z
        .number()
        .optional()
        .describe(
          'Office ID from list_offices; provisioning or moves may affect licenses and billing'
        ),
      license: z.string().optional().describe('License type (e.g., talk, user, lite_lines)'),
      doNotDisturb: z
        .boolean()
        .optional()
        .describe(
          'Enable or disable Do Not Disturb in a separate update, without other changes.'
        ),
      jobTitle: z.string().optional().describe('Job title'),
      timezone: z
        .string()
        .optional()
        .describe(
          'Readable legacy field; current user mutation API does not support it. Set it in Dialpad settings.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'manage_user');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
