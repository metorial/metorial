import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, retrieve, deactivate, or reactivate a user in Metabase.
Supports setting the user's name, email, group memberships, and superuser status.
Use **deactivate** to disable a user account or **reactivate** to restore it.`,
  constraints: ['Most user management operations require superuser (admin) privileges.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'deactivate', 'reactivate', 'current'])
        .describe('The action to perform'),
      userId: z
        .number()
        .optional()
        .describe('ID of the user (required for get, update, deactivate, reactivate)'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      email: z.string().optional().describe('Email address (required for create)'),
      password: z.string().optional().describe('Password for the new user (for create)'),
      groupIds: z
        .array(z.number())
        .optional()
        .describe('Permission group IDs to assign the user to'),
      isSuperuser: z
        .boolean()
        .optional()
        .describe('Whether the user should have superuser (admin) privileges'),
      includeDeactivated: z
        .boolean()
        .optional()
        .describe('Include deactivated users in list results')
    })
  )
  .output(
    z.object({
      userId: z.number().optional().describe('ID of the user'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      isSuperuser: z.boolean().optional().describe('Whether the user is a superuser'),
      isActive: z.boolean().optional().describe('Whether the user account is active'),
      dateJoined: z.string().optional().describe('When the user joined'),
      lastLogin: z.string().nullable().optional().describe('Last login timestamp'),
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            firstName: z.string().nullable().describe('First name'),
            lastName: z.string().nullable().describe('Last name'),
            email: z.string().describe('Email address'),
            isSuperuser: z.boolean().describe('Superuser status'),
            isActive: z.boolean().describe('Active status')
          })
        )
        .optional()
        .describe('List of users (for list action)'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let result = await client.listUsers({
        includeDeactivated: ctx.input.includeDeactivated
      });
      let data = result.data || result;
      let users = (Array.isArray(data) ? data : []).map((u: any) => ({
        userId: u.id,
        firstName: u.first_name ?? null,
        lastName: u.last_name ?? null,
        email: u.email,
        isSuperuser: u.is_superuser ?? false,
        isActive: u.is_active ?? true
      }));

      return {
        output: { users },
        message: `Found **${users.length}** user(s)`
      };
    }

    if (ctx.input.action === 'current') {
      let user = await client.getCurrentUser();
      return {
        output: {
          userId: user.id,
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          email: user.email,
          isSuperuser: user.is_superuser ?? false,
          isActive: user.is_active ?? true,
          dateJoined: user.date_joined,
          lastLogin: user.last_login ?? null
        },
        message: `Current user: **${user.first_name} ${user.last_name}** (${user.email})`
      };
    }

    if (ctx.input.action === 'create') {
      let user = await client.createUser({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email!,
        password: ctx.input.password,
        groupIds: ctx.input.groupIds
      });

      return {
        output: {
          userId: user.id,
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          email: user.email,
          isSuperuser: user.is_superuser ?? false,
          isActive: user.is_active ?? true,
          dateJoined: user.date_joined,
          lastLogin: user.last_login ?? null
        },
        message: `Created user **${user.first_name} ${user.last_name}** (ID: ${user.id})`
      };
    }

    if (ctx.input.action === 'update') {
      let user = await client.updateUser(ctx.input.userId!, {
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        groupIds: ctx.input.groupIds,
        isSuperuser: ctx.input.isSuperuser
      });

      return {
        output: {
          userId: user.id,
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          email: user.email,
          isSuperuser: user.is_superuser ?? false,
          isActive: user.is_active ?? true,
          dateJoined: user.date_joined,
          lastLogin: user.last_login ?? null
        },
        message: `Updated user **${user.first_name} ${user.last_name}** (ID: ${user.id})`
      };
    }

    if (ctx.input.action === 'deactivate') {
      await client.deactivateUser(ctx.input.userId!);
      return {
        output: { userId: ctx.input.userId, success: true, isActive: false },
        message: `Deactivated user ${ctx.input.userId}`
      };
    }

    if (ctx.input.action === 'reactivate') {
      let user = await client.reactivateUser(ctx.input.userId!);
      return {
        output: {
          userId: user.id,
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          email: user.email,
          isSuperuser: user.is_superuser ?? false,
          isActive: true,
          dateJoined: user.date_joined,
          lastLogin: user.last_login ?? null
        },
        message: `Reactivated user **${user.first_name} ${user.last_name}** (ID: ${user.id})`
      };
    }

    // get
    let user = await client.getUser(ctx.input.userId!);
    return {
      output: {
        userId: user.id,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        email: user.email,
        isSuperuser: user.is_superuser ?? false,
        isActive: user.is_active ?? true,
        dateJoined: user.date_joined,
        lastLogin: user.last_login ?? null
      },
      message: `Retrieved user **${user.first_name} ${user.last_name}** (${user.email})`
    };
  })
  .build();
