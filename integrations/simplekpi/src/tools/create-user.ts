import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user account in SimpleKPI. Set the user's role, status, permissions, and login credentials.`,
  instructions: [
    'Password is required on creation but cannot be changed via the API afterwards.',
    'canManageUsers is only relevant for the Manager user type.',
    'canAdminSettings is only relevant for the Admin user type.'
  ]
})
  .input(
    z.object({
      firstName: z.string().describe('First name (max 50 characters)'),
      lastName: z.string().optional().describe('Last name (max 50 characters)'),
      email: z.string().describe('Email address (max 150 characters, used for login)'),
      password: z
        .string()
        .describe('Password (max 20 characters, cannot be changed via API later)'),
      userType: z.enum(['Admin', 'Director', 'Manager', 'User']).describe('User role'),
      userStatusId: z.enum(['A', 'L']).default('A').describe('A=Active, L=Locked'),
      canManageUsers: z
        .boolean()
        .default(false)
        .describe('Can manage other users (Manager type only)'),
      canAdminSettings: z
        .boolean()
        .default(false)
        .describe('Can administer settings (Admin type only)')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the newly created user'),
      email: z.string().describe('Email of the created user')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.createUser({
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      email: ctx.input.email,
      password: ctx.input.password,
      user_type: ctx.input.userType,
      user_status_id: ctx.input.userStatusId,
      can_manage_users: ctx.input.canManageUsers,
      can_admin_settings: ctx.input.canAdminSettings
    });

    return {
      output: {
        userId: result.id,
        email: result.email
      },
      message: `Created user **${result.first_name} ${result.last_name || ''}** (ID: ${result.id}).`
    };
  })
  .build();
