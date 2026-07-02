import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { ProjectClient } from '../lib/project-client';
import { spec } from '../spec';

export let manageAuthUsers = SlateTool.create(spec, {
  name: 'Manage Auth Users',
  key: 'manage_auth_users',
  description: `List, get, create, update, or delete authentication users in a Supabase project. Uses the admin Auth API with the service_role key to manage user accounts.`,
  instructions: [
    'For **list**: returns paginated users.',
    'For **create**: provide at least email or phone, and a password.',
    'For **update**: provide the userId and the fields to change.',
    'For **delete**: provide the userId to permanently remove the user.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      userId: z.string().optional().describe('User ID (required for get, update, delete)'),
      email: z.string().optional().describe('User email address'),
      phone: z.string().optional().describe('User phone number'),
      password: z.string().optional().describe('User password'),
      emailConfirm: z.boolean().optional().describe('Auto-confirm email address'),
      phoneConfirm: z.boolean().optional().describe('Auto-confirm phone number'),
      userMetadata: z.record(z.string(), z.any()).optional().describe('Custom user metadata'),
      banned: z.boolean().optional().describe('Ban or unban the user (for update)'),
      page: z.number().optional().describe('Page number (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().optional().describe('User email'),
            phone: z.string().optional().describe('User phone'),
            createdAt: z.string().optional().describe('Account creation timestamp'),
            lastSignInAt: z.string().optional().describe('Last sign-in timestamp'),
            emailConfirmedAt: z.string().optional().describe('Email confirmation timestamp'),
            userMetadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
          })
        )
        .optional()
        .describe('List of users (for list action)'),
      user: z
        .object({
          userId: z.string().describe('User ID'),
          email: z.string().optional().describe('User email'),
          phone: z.string().optional().describe('User phone'),
          createdAt: z.string().optional().describe('Account creation timestamp'),
          lastSignInAt: z.string().optional().describe('Last sign-in timestamp'),
          emailConfirmedAt: z.string().optional().describe('Email confirmation timestamp'),
          userMetadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
        })
        .optional()
        .describe('User details'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);

    let mgmt = new ManagementClient(ctx.auth.token);
    let keys = await mgmt.getProjectApiKeys(projectRef);
    let serviceKey = (Array.isArray(keys) ? keys : []).find(
      (k: any) => k.name === 'service_role'
    );
    let apiKey = serviceKey?.api_key;

    if (!apiKey) {
      throw createApiServiceError('Could not retrieve service_role API key for the project');
    }

    let projectClient = new ProjectClient(projectRef, apiKey);
    let { action } = ctx.input;

    let mapUser = (u: any) => ({
      userId: u.id ?? '',
      email: u.email ?? undefined,
      phone: u.phone ?? undefined,
      createdAt: u.created_at ?? undefined,
      lastSignInAt: u.last_sign_in_at ?? undefined,
      emailConfirmedAt: u.email_confirmed_at ?? undefined,
      userMetadata: u.user_metadata ?? undefined
    });

    if (action === 'list') {
      let data = await projectClient.listAuthUsers({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let userList = data?.users ?? data;
      let users = (Array.isArray(userList) ? userList : []).map(mapUser);

      return {
        output: { users },
        message: `Found **${users.length}** auth users in project **${projectRef}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.userId) throw createApiServiceError('userId is required for get action');
      let u = await projectClient.getAuthUser(ctx.input.userId);
      return {
        output: { user: mapUser(u) },
        message: `Retrieved user **${u.email ?? u.phone ?? ctx.input.userId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.email && !ctx.input.phone) {
        throw createApiServiceError('email or phone is required for create action');
      }
      let u = await projectClient.createAuthUser({
        email: ctx.input.email,
        phone: ctx.input.phone,
        password: ctx.input.password,
        emailConfirm: ctx.input.emailConfirm,
        phoneConfirm: ctx.input.phoneConfirm,
        userMetadata: ctx.input.userMetadata
      });
      return {
        output: { user: mapUser(u) },
        message: `Created user **${ctx.input.email ?? ctx.input.phone}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.userId)
        throw createApiServiceError('userId is required for update action');
      let u = await projectClient.updateAuthUser(ctx.input.userId, {
        email: ctx.input.email,
        phone: ctx.input.phone,
        password: ctx.input.password,
        emailConfirm: ctx.input.emailConfirm,
        phoneConfirm: ctx.input.phoneConfirm,
        userMetadata: ctx.input.userMetadata,
        banned: ctx.input.banned
      });
      return {
        output: { user: mapUser(u) },
        message: `Updated user **${ctx.input.userId}**.`
      };
    }

    // delete
    if (!ctx.input.userId) throw createApiServiceError('userId is required for delete action');
    await projectClient.deleteAuthUser(ctx.input.userId);
    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();
