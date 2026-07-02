import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user's profile, status, or roles in VEO. Can modify name, email, password, active status, and organisation roles. Only provide the fields you want to change.`,
  instructions: [
    'Role IDs: 4 = standard User, 2 = Organisation Admin.',
    'Roles are set per-organisation. Provide the organisationId and role IDs together.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      password: z.string().optional().describe('New password (only if resetting)'),
      isActive: z.boolean().optional().describe('Set to false to deactivate the user'),
      roles: z
        .array(
          z.object({
            organisationId: z.string().describe('Organisation ID for the role assignment'),
            roles: z.array(z.number()).describe('Array of role IDs (4 = User, 2 = Org Admin)')
          })
        )
        .optional()
        .describe('Organisation-specific role assignments')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    await client.updateUser(ctx.input.userId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      password: ctx.input.password,
      isActive: ctx.input.isActive,
      roles: ctx.input.roles
    });

    return {
      output: { success: true },
      message: `Updated user \`${ctx.input.userId}\`.`
    };
  })
  .build();
