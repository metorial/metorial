import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user. When creating, provide username (email), full name, and role. When updating, provide the user identifier and the fields to change.`,
  instructions: [
    'To create: set action to "create" and provide username, fullName, and role.',
    'To update: set action to "update" and provide userIdentifier plus the fields to change.',
    'To delete: set action to "delete" and provide userIdentifier.',
    'Role can be "Owner", "Admin", "User", or a custom role name.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      userIdentifier: z
        .string()
        .optional()
        .describe('User ID or username (required for update/delete)'),
      username: z.string().optional().describe('User email address (required for create)'),
      fullName: z.string().optional().describe('Full name of the user (required for create)'),
      role: z
        .string()
        .optional()
        .describe('User role: Owner, Admin, User, or custom role (required for create)'),
      timezone: z.string().optional().describe('User timezone (e.g., "America/New_York")'),
      locale: z.string().optional().describe('User locale (e.g., "en_US")'),
      tags: z.array(z.string()).optional().describe('User tags'),
      invitationDisabled: z
        .boolean()
        .optional()
        .describe('Disable invitation email (only for create)')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      username: z.string().optional().describe('User email'),
      result: z.string().describe('Operation result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.username || !ctx.input.fullName || !ctx.input.role) {
          throw new Error('username, fullName, and role are required when creating a user.');
        }
        let user = await client.createUser({
          username: ctx.input.username,
          fullName: ctx.input.fullName,
          role: { name: ctx.input.role },
          timezone: ctx.input.timezone,
          locale: ctx.input.locale,
          tags: ctx.input.tags,
          invitationDisabled: ctx.input.invitationDisabled
        });
        return {
          output: {
            userId: user.id,
            username: user.username ?? ctx.input.username,
            result: 'User created successfully'
          },
          message: `Created user **${ctx.input.fullName}** (${ctx.input.username})`
        };
      }
      case 'update': {
        if (!ctx.input.userIdentifier) {
          throw new Error('userIdentifier is required when updating a user.');
        }
        let updateData: any = {};
        if (ctx.input.username !== undefined) updateData.username = ctx.input.username;
        if (ctx.input.fullName !== undefined) updateData.fullName = ctx.input.fullName;
        if (ctx.input.role !== undefined) updateData.role = { name: ctx.input.role };
        if (ctx.input.timezone !== undefined) updateData.timezone = ctx.input.timezone;
        if (ctx.input.locale !== undefined) updateData.locale = ctx.input.locale;
        if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;

        let updated = await client.updateUser(ctx.input.userIdentifier, updateData);
        return {
          output: {
            userId: updated.id ?? ctx.input.userIdentifier,
            username: updated.username,
            result: 'User updated successfully'
          },
          message: `Updated user \`${ctx.input.userIdentifier}\``
        };
      }
      case 'delete': {
        if (!ctx.input.userIdentifier) {
          throw new Error('userIdentifier is required when deleting a user.');
        }
        await client.deleteUser(ctx.input.userIdentifier);
        return {
          output: {
            result: 'User deleted successfully'
          },
          message: `Deleted user \`${ctx.input.userIdentifier}\``
        };
      }
    }
  })
  .build();
