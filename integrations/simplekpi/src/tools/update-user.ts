import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's profile. Only provide the fields you want to change. Password cannot be changed via the API.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      email: z.string().optional().describe('New email address'),
      userType: z
        .enum(['Admin', 'Director', 'Manager', 'User'])
        .optional()
        .describe('New user role'),
      userStatusId: z.enum(['A', 'L']).optional().describe('New status: A=Active, L=Locked'),
      canManageUsers: z.boolean().optional().describe('Can manage other users'),
      canAdminSettings: z.boolean().optional().describe('Can administer settings')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the updated user'),
      email: z.string().describe('Email of the updated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.userType !== undefined) data.user_type = ctx.input.userType;
    if (ctx.input.userStatusId !== undefined) data.user_status_id = ctx.input.userStatusId;
    if (ctx.input.canManageUsers !== undefined)
      data.can_manage_users = ctx.input.canManageUsers;
    if (ctx.input.canAdminSettings !== undefined)
      data.can_admin_settings = ctx.input.canAdminSettings;

    let result = await client.updateUser(ctx.input.userId, data);

    return {
      output: {
        userId: result.id,
        email: result.email
      },
      message: `Updated user **${result.first_name} ${result.last_name || ''}** (ID: ${result.id}).`
    };
  })
  .build();
