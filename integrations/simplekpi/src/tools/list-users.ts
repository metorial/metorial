import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User identifier'),
  userType: z.string().describe('User type: Admin, Director, Manager, or User'),
  userStatusId: z.string().describe('Status: A=Active, L=Locked'),
  firstName: z.string().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  email: z.string().describe('Email address'),
  canManageUsers: z.boolean().describe('Can manage other users'),
  canAdminSettings: z.boolean().describe('Can administer settings'),
  lastLoginAt: z.string().nullable().describe('Last login timestamp (UTC)'),
  createdAt: z.string().nullable().describe('Creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users in your SimpleKPI account. Returns user details including name, email, role, status, and permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('List of all users')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let users = await client.listUsers();

    let mapped = users.map((u: any) => ({
      userId: u.id,
      userType: u.user_type,
      userStatusId: u.user_status_id,
      firstName: u.first_name,
      lastName: u.last_name ?? null,
      email: u.email,
      canManageUsers: u.can_manage_users,
      canAdminSettings: u.can_admin_settings,
      lastLoginAt: u.last_login_at ?? null,
      createdAt: u.created_at ?? null,
      updatedAt: u.updated_at ?? null
    }));

    return {
      output: { users: mapped },
      message: `Retrieved **${mapped.length}** users.`
    };
  })
  .build();
