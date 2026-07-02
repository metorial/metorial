import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user. Also supports managing group memberships and dashboard assignments for a user.`,
  instructions: [
    'Use action "create" to invite a new user, "update" to modify, or "delete" to remove.',
    'You can add/remove users from groups and assign/unassign dashboards in the same call.'
  ],
  constraints: [
    'Cannot delete your own account, the super admin, or technical/business contacts.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      userId: z.string().optional().describe('User ID (required for update and delete)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name (required for create)'),
      email: z.string().optional().describe('Email address (required for create)'),
      externalId: z.string().optional().describe('External identifier'),
      roles: z.array(z.string()).optional().describe('Role IDs to assign (for create)'),
      password: z.string().optional().describe('Password (for create)'),
      clientId: z.string().optional().describe('Client ID (for create)'),
      sendEmail: z.boolean().optional().describe('Send invitation email (for create)'),
      addToGroupIds: z.array(z.string()).optional().describe('Group IDs to add the user to'),
      removeFromGroupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to remove the user from'),
      assignTabIds: z
        .array(z.string())
        .optional()
        .describe('Dashboard (tab) IDs to assign to the user'),
      unassignTabInstanceIds: z
        .array(z.string())
        .optional()
        .describe('Tab instance IDs to remove from the user')
    })
  )
  .output(
    z.object({
      userId: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.firstName) throw new Error('firstName is required when creating a user');
      if (!ctx.input.lastName) throw new Error('lastName is required when creating a user');
      if (!ctx.input.email) throw new Error('email is required when creating a user');

      let result = await client.createUser({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        roles: ctx.input.roles,
        password: ctx.input.password,
        externalId: ctx.input.externalId,
        clientId: ctx.input.clientId,
        sendEmail: ctx.input.sendEmail
      });

      let location = result?.meta?.location;
      let userId = location ? location.split('/').pop() : undefined;

      if (userId && ctx.input.addToGroupIds) {
        for (let groupId of ctx.input.addToGroupIds) {
          await client.addUserToGroup(userId, groupId);
        }
      }

      if (userId && ctx.input.assignTabIds && ctx.input.assignTabIds.length > 0) {
        await client.addTabsToUser(userId, ctx.input.assignTabIds);
      }

      return {
        output: { userId, success: true },
        message: `Created user **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email})${userId ? ` with ID \`${userId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.userId) throw new Error('userId is required when updating a user');

      if (
        ctx.input.firstName !== undefined ||
        ctx.input.lastName !== undefined ||
        ctx.input.email !== undefined ||
        ctx.input.externalId !== undefined
      ) {
        await client.updateUser(ctx.input.userId, {
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          externalId: ctx.input.externalId
        });
      }

      if (ctx.input.addToGroupIds) {
        for (let groupId of ctx.input.addToGroupIds) {
          await client.addUserToGroup(ctx.input.userId, groupId);
        }
      }

      if (ctx.input.removeFromGroupIds) {
        for (let groupId of ctx.input.removeFromGroupIds) {
          await client.removeUserFromGroup(ctx.input.userId, groupId);
        }
      }

      if (ctx.input.assignTabIds && ctx.input.assignTabIds.length > 0) {
        await client.addTabsToUser(ctx.input.userId, ctx.input.assignTabIds);
      }

      if (ctx.input.unassignTabInstanceIds) {
        for (let tabInstanceId of ctx.input.unassignTabInstanceIds) {
          await client.removeTabFromUser(ctx.input.userId, tabInstanceId);
        }
      }

      return {
        output: { userId: ctx.input.userId, success: true },
        message: `Updated user \`${ctx.input.userId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.userId) throw new Error('userId is required when deleting a user');
      await client.deleteUser(ctx.input.userId);

      return {
        output: { userId: ctx.input.userId, success: true },
        message: `Deleted user \`${ctx.input.userId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
