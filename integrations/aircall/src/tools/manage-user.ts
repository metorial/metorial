import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, or delete a user in Aircall. When creating, provide email, first name, and last name. When updating, specify only the fields to change. Supports setting availability, roles, and wrap-up time.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      userId: z.number().optional().describe('User ID (required for update and delete)'),
      email: z.string().optional().describe('Email address (required for create)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name (required for create)'),
      availabilityStatus: z
        .enum(['available', 'custom', 'unavailable'])
        .optional()
        .describe('Availability status'),
      substatus: z
        .enum(['out_for_lunch', 'on_a_break', 'in_training', 'doing_back_office', 'other'])
        .optional()
        .describe('Substatus when availabilityStatus is custom'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe('Role IDs: owner, supervisor, admin, agent'),
      wrapUpTime: z.number().optional().describe('Wrap-up time in seconds after each call')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('User ID'),
      name: z.string().optional().describe('Full name of the user'),
      email: z.string().optional().describe('Email address'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.email || !ctx.input.firstName || !ctx.input.lastName) {
        throw new Error('email, firstName, and lastName are required for creating a user');
      }
      let user = await client.createUser({
        email: ctx.input.email,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        availabilityStatus: ctx.input.availabilityStatus,
        roleIds: ctx.input.roleIds,
        wrapUpTime: ctx.input.wrapUpTime
      });
      return {
        output: {
          userId: user.id,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email
        },
        message: `Created user **${user.name || `${ctx.input.firstName} ${ctx.input.lastName}`}** (${user.email}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.userId) throw new Error('userId is required for updating a user');
      let user = await client.updateUser(ctx.input.userId, {
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        availabilityStatus: ctx.input.availabilityStatus,
        substatus: ctx.input.substatus,
        roleIds: ctx.input.roleIds,
        wrapUpTime: ctx.input.wrapUpTime
      });
      return {
        output: {
          userId: user.id,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email
        },
        message: `Updated user **${user.name}** (#${user.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.userId) throw new Error('userId is required for deleting a user');
      await client.deleteUser(ctx.input.userId);
      return {
        output: {
          userId: ctx.input.userId,
          deleted: true
        },
        message: `Deleted user **#${ctx.input.userId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
