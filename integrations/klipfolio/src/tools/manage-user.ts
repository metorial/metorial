import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { createdId, validateInput } from '../lib/contracts';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user. Also supports managing group memberships and dashboard assignments for a user.`,
  instructions: [
    'Use action "create" to add a new user, "update" to modify, or "delete" to remove.',
    'You can add/remove users from groups and assign/unassign dashboards in the same call.'
  ],
  constraints: [
    'Cannot delete your own account, the super admin, or technical/business contacts.',
    'Adding users can consume seats. sendEmail sends a real welcome email. Group and dashboard changes affect access immediately; earlier changes remain if a later request fails.'
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
      roles: z
        .array(z.string())
        .optional()
        .describe('Role IDs to assign; at least one is required for create'),
      password: z.string().optional().describe('Password (for create)'),
      clientId: z.string().optional().describe('Client ID (for create)'),
      sendEmail: z
        .boolean()
        .optional()
        .describe(
          'Send a welcome email when creating; default false. Enabling sends a real email.'
        ),
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
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.firstName)
        throw createApiServiceError('firstName is required when creating a user');
      if (!ctx.input.lastName)
        throw createApiServiceError('lastName is required when creating a user');
      if (!ctx.input.email)
        throw createApiServiceError('email is required when creating a user');

      if (!ctx.input.roles?.length)
        throw createApiServiceError('At least one role ID is required when creating a user.');

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

      let userId = createdId(result, 'users');

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
      if (
        ctx.input.firstName === undefined &&
        ctx.input.lastName === undefined &&
        ctx.input.email === undefined &&
        ctx.input.externalId === undefined &&
        ctx.input.addToGroupIds === undefined &&
        ctx.input.removeFromGroupIds === undefined &&
        ctx.input.assignTabIds === undefined &&
        ctx.input.unassignTabInstanceIds === undefined
      )
        throw createApiServiceError(
          'Provide at least one supported field or association to update.',
          { reason: 'invalid_input' }
        );
      if (!ctx.input.userId)
        throw createApiServiceError('userId is required when updating a user');

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
      if (!ctx.input.userId)
        throw createApiServiceError('userId is required when deleting a user');
      await client.deleteUser(ctx.input.userId);

      return {
        output: { userId: ctx.input.userId, success: true },
        message: `Deleted user \`${ctx.input.userId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
