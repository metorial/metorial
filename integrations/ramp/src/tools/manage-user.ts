import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Invite a new user, update an existing user's details, deactivate, or reactivate a Ramp user.
- **invite**: Sends an invitation email to join the Ramp business. Requires email, name, and role.
- **update**: Modifies user fields such as department, location, manager, or role.
- **deactivate** / **reactivate**: Changes the user's active status.`,
  instructions: [
    'For invite action, role must be one of: BUSINESS_ADMIN, BUSINESS_USER, BUSINESS_BOOKKEEPER',
    'For invite, an idempotencyKey is auto-generated if not provided'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['invite', 'update', 'deactivate', 'reactivate'])
        .describe('Action to perform on the user'),
      userId: z
        .string()
        .optional()
        .describe('Required for update, deactivate, reactivate actions'),
      email: z.string().optional().describe('Email address (required for invite)'),
      firstName: z.string().optional().describe('First name (required for invite)'),
      lastName: z.string().optional().describe('Last name (required for invite)'),
      role: z
        .enum(['BUSINESS_ADMIN', 'BUSINESS_USER', 'BUSINESS_BOOKKEEPER'])
        .optional()
        .describe('User role'),
      departmentId: z.string().optional().describe('Department ID to assign'),
      locationId: z.string().optional().describe('Location ID to assign'),
      directManagerId: z.string().optional().describe('Direct manager user ID'),
      isManager: z.boolean().optional().describe('Whether the user is a manager'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique idempotency key for invite action')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response from the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'invite') {
      if (!ctx.input.email || !ctx.input.firstName || !ctx.input.lastName || !ctx.input.role) {
        throw new Error('email, firstName, lastName, and role are required for invite action');
      }

      let result = await client.createUserInvite({
        email: ctx.input.email,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        role: ctx.input.role,
        departmentId: ctx.input.departmentId,
        locationId: ctx.input.locationId,
        directManagerId: ctx.input.directManagerId,
        isManager: ctx.input.isManager,
        idempotencyKey: ctx.input.idempotencyKey || crypto.randomUUID()
      });

      return {
        output: { result },
        message: `Invited **${ctx.input.email}** as **${ctx.input.role}**.`
      };
    }

    if (!ctx.input.userId) {
      throw new Error('userId is required for update, deactivate, and reactivate actions');
    }

    if (action === 'update') {
      let result = await client.updateUser(ctx.input.userId, {
        departmentId: ctx.input.departmentId,
        locationId: ctx.input.locationId,
        directManagerId: ctx.input.directManagerId,
        role: ctx.input.role
      });

      return {
        output: { result },
        message: `Updated user **${ctx.input.userId}**.`
      };
    }

    if (action === 'deactivate') {
      let result = await client.deactivateUser(ctx.input.userId);
      return {
        output: { result },
        message: `Deactivated user **${ctx.input.userId}**.`
      };
    }

    if (action === 'reactivate') {
      let result = await client.reactivateUser(ctx.input.userId);
      return {
        output: { result },
        message: `Reactivated user **${ctx.input.userId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
