import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getUsers = SlateTool.create(spec, {
  name: 'Get Users',
  key: 'get_users',
  description: `Retrieve users from the Pipedrive account. Fetch the current authenticated user, a specific user by ID, or list all users.
Returns user details including name, email, role, and active status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .number()
        .optional()
        .describe('Specific user ID to fetch. Omit to list all users.'),
      currentUser: z
        .boolean()
        .optional()
        .describe('Set to true to fetch the currently authenticated user')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            name: z.string().describe('User name'),
            email: z.string().optional().describe('Email address'),
            activeFlag: z.boolean().optional().describe('Whether active'),
            isAdmin: z.boolean().optional().describe('Whether user is an admin'),
            roleId: z.number().optional().describe('Role ID'),
            iconUrl: z.string().optional().nullable().describe('Profile image URL'),
            created: z.string().optional().describe('Account creation date'),
            modified: z.string().optional().nullable().describe('Last modification date')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.currentUser) {
      let result = await client.getCurrentUser();
      let u = result?.data;
      return {
        output: {
          users: u
            ? [
                {
                  userId: u.id,
                  name: u.name,
                  email: u.email,
                  activeFlag: u.active_flag,
                  isAdmin: u.is_admin === 1,
                  roleId: u.role_id,
                  iconUrl: u.icon_url,
                  created: u.created,
                  modified: u.modified
                }
              ]
            : []
        },
        message: u
          ? `Current user: **${u.name}** (${u.email}).`
          : 'Could not fetch current user.'
      };
    }

    if (ctx.input.userId) {
      let result = await client.getUser(ctx.input.userId);
      let u = result?.data;
      return {
        output: {
          users: u
            ? [
                {
                  userId: u.id,
                  name: u.name,
                  email: u.email,
                  activeFlag: u.active_flag,
                  isAdmin: u.is_admin === 1,
                  roleId: u.role_id,
                  iconUrl: u.icon_url,
                  created: u.created,
                  modified: u.modified
                }
              ]
            : []
        },
        message: u ? `Found user **${u.name}** (ID: ${u.id}).` : 'User not found.'
      };
    }

    let result = await client.getUsers();
    let users = (result?.data || []).map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      activeFlag: u.active_flag,
      isAdmin: u.is_admin === 1,
      roleId: u.role_id,
      iconUrl: u.icon_url,
      created: u.created,
      modified: u.modified
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  });
