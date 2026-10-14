import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description:
    'Retrieve a user by ID, including role, status, permissions, and login timestamps. Use List Users to discover user IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ userId: z.number().describe('User ID from List Users') }))
  .output(
    z.object({
      userId: z.number().describe('User identifier'),
      userType: z.string().describe('User role'),
      userStatusId: z.string().describe('Account status: A=Active, L=Locked'),
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().describe('Email address'),
      canManageUsers: z.boolean().describe('Whether the user can manage other users'),
      canAdminSettings: z.boolean().describe('Whether the user can administer settings'),
      lastLoginAt: z.string().nullable().describe('Last login timestamp (UTC)'),
      lastPasswordChangedAt: z
        .string()
        .nullable()
        .describe('Last password change timestamp (UTC)'),
      createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
      updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx.config, ctx.auth).getUser(ctx.input.userId);
    return {
      output: {
        userId: user.id,
        userType: user.user_type,
        userStatusId: user.user_status_id,
        firstName: user.first_name,
        lastName: user.last_name ?? null,
        email: user.email,
        canManageUsers: user.can_manage_users,
        canAdminSettings: user.can_admin_settings,
        lastLoginAt: user.last_login_at ?? null,
        lastPasswordChangedAt: user.last_password_changed_at ?? null,
        createdAt: user.created_at ?? null,
        updatedAt: user.updated_at ?? null
      },
      message: `Retrieved user **${user.email}** (ID: ${user.id}).`
    };
  })
  .build();
