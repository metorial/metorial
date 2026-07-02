import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('Unique identifier of the user'),
  email: z.string().describe('Email address of the user'),
  firstName: z.string().optional().describe('First name of the user'),
  lastName: z.string().optional().describe('Last name of the user'),
  status: z.string().optional().describe('User status (e.g. "active")'),
  builder: z
    .object({ global: z.boolean().optional() })
    .optional()
    .describe('Builder privileges'),
  admin: z.object({ global: z.boolean().optional() }).optional().describe('Admin privileges'),
  roles: z
    .record(z.string(), z.string())
    .optional()
    .describe('Roles assigned per application (appId -> role)')
});

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, retrieve, update, or delete a user in the Budibase tenant. Supports setting email, name, password, roles, and builder/admin privileges.`,
  instructions: [
    'For "create", email is required. Password is optional if using SSO.',
    'Roles map application IDs to role names (e.g. "BASIC", "POWER", "ADMIN").',
    'Builder and admin objects control global builder and admin access.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('The operation to perform'),
      userId: z.string().optional().describe('User ID (required for get, update, delete)'),
      email: z
        .string()
        .optional()
        .describe('Email address (required for create, optional for update)'),
      password: z
        .string()
        .optional()
        .describe('Password for the user (only for create/update)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      status: z.string().optional().describe('User status, e.g. "active"'),
      forceResetPassword: z
        .boolean()
        .optional()
        .describe('Force user to reset password on first login'),
      builder: z
        .object({ global: z.boolean().optional() })
        .optional()
        .describe('Builder privileges'),
      admin: z
        .object({ global: z.boolean().optional() })
        .optional()
        .describe('Admin privileges'),
      roles: z
        .record(z.string(), z.string())
        .optional()
        .describe('Application roles as { appId: roleName }')
    })
  )
  .output(
    z.object({
      user: userOutputSchema.optional().describe('The user data (not returned for delete)'),
      deleted: z.boolean().optional().describe('Whether the user was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let {
      action,
      userId,
      email,
      password,
      firstName,
      lastName,
      status,
      forceResetPassword,
      builder,
      admin,
      roles
    } = ctx.input;

    let mapUser = (u: any) => ({
      userId: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status,
      builder: u.builder,
      admin: u.admin,
      roles: u.roles
    });

    if (action === 'create') {
      if (!email) throw new Error('Email is required to create a user');
      let user = await client.createUser({
        email,
        password,
        firstName,
        lastName,
        status,
        forceResetPassword,
        builder,
        admin,
        roles: roles as Record<string, string> | undefined
      });
      let mapped = mapUser(user);
      return {
        output: { user: mapped },
        message: `Created user **${mapped.email}** (${mapped.userId}).`
      };
    }

    if (!userId) throw new Error('userId is required for get, update, and delete actions');

    if (action === 'get') {
      let user = await client.getUser(userId);
      let mapped = mapUser(user);
      return {
        output: { user: mapped },
        message: `Retrieved user **${mapped.email}** (${mapped.userId}).`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, any> = {};
      if (email !== undefined) updateData.email = email;
      if (password !== undefined) updateData.password = password;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (status !== undefined) updateData.status = status;
      if (forceResetPassword !== undefined) updateData.forceResetPassword = forceResetPassword;
      if (builder !== undefined) updateData.builder = builder;
      if (admin !== undefined) updateData.admin = admin;
      if (roles !== undefined) updateData.roles = roles;
      let user = await client.updateUser(userId, updateData);
      let mapped = mapUser(user);
      return {
        output: { user: mapped },
        message: `Updated user **${mapped.email}** (${mapped.userId}).`
      };
    }

    await client.deleteUser(userId);
    return {
      output: { deleted: true },
      message: `Deleted user **${userId}**.`
    };
  })
  .build();
