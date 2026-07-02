import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDashboardUser = SlateTool.create(spec, {
  name: 'Manage Dashboard User',
  key: 'manage_dashboard_user',
  description: `Create, list, enable, disable, or remove dashboard users. Provision user accounts with role-based access control and organizational permissions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'enable', 'disable', 'remove'])
        .describe('Action to perform'),
      username: z
        .string()
        .optional()
        .describe('Username (required for enable, disable, remove)'),
      email: z.string().optional().describe('User email (required for create)'),
      name: z.string().optional().describe('User display name'),
      roles: z.array(z.string()).optional().describe('Roles to assign to the user'),
      organisations: z
        .array(z.string())
        .optional()
        .describe('Organisation IDs the user has access to'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        user: z.any().optional().describe('User record'),
        users: z.array(z.any()).optional().describe('List of user records'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, username } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.email)
          throw new Error('email is required for creating a dashboard user');
        let result = await client.createDashboardUser({
          email: ctx.input.email,
          name: ctx.input.name,
          roles: ctx.input.roles,
          organisations: ctx.input.organisations
        });
        let data = result?.data ?? result;
        return {
          output: { user: data, success: true },
          message: `Dashboard user created for **${ctx.input.email}**.`
        };
      }
      case 'list': {
        let result = await client.listDashboardUsers({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let users = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { users, success: true },
          message: `Found **${users.length}** dashboard user(s).`
        };
      }
      case 'enable': {
        if (!username) throw new Error('username is required for enable action');
        let result = await client.enableDashboardUser(username);
        let data = result?.data ?? result;
        return {
          output: { user: data, success: true },
          message: `Dashboard user **${username}** enabled.`
        };
      }
      case 'disable': {
        if (!username) throw new Error('username is required for disable action');
        let result = await client.disableDashboardUser(username);
        let data = result?.data ?? result;
        return {
          output: { user: data, success: true },
          message: `Dashboard user **${username}** disabled.`
        };
      }
      case 'remove': {
        if (!username) throw new Error('username is required for remove action');
        await client.removeDashboardUser(username);
        return {
          output: { success: true },
          message: `Dashboard user **${username}** removed.`
        };
      }
    }
  })
  .build();
