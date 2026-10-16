import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageDashboardUser = SlateTool.create(spec, {
  name: 'Manage Dashboard User',
  key: 'manage_dashboard_user',
  description: `Create, list, enable, disable, or remove dashboard users. Provision user accounts with role-based access control and organizational permissions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z
        .enum(['create', 'list', 'enable', 'disable', 'remove'])
        .describe('Action to perform'),
      username: z
        .string()
        .optional()
        .describe('Username (required for enable, disable, remove)'),
      email: z.string().optional().describe('User email (required for create)'),
      name: z.string().optional().describe('User display name'),
      roles: z
        .array(z.string())
        .optional()
        .describe(
          'Roles to assign to the user. When organisations is supplied, these explicit roles are assigned to each listed organisation.'
        ),
      organisations: z
        .array(z.string())
        .optional()
        .describe(
          'Numeric organisation IDs from get_current_user, supplied as strings. Requires explicit roles for each membership. Use memberships for different roles per organisation.'
        ),
      memberships: z
        .array(
          z.object({
            organisationId: z
              .number()
              .describe('Numeric organisation ID from get_current_user.'),
            roles: z
              .array(z.string())
              .describe(
                'Explicit roles: borneo_admin, borneo_analyst, compliance_engineer, data_engineer, department_coordinator, borneo_engineer, no_access_role, or privacy_supervisor.'
              ),
            departments: z
              .array(z.string())
              .optional()
              .describe('Optional department IDs for this organisation membership.')
          })
        )
        .optional()
        .describe(
          'Explicit organisation memberships. Use either this field or organisations.'
        ),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, username } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.email)
          throw createApiServiceError('email is required for creating a dashboard user');
        let result = await client.createDashboardUser({
          email: ctx.input.email,
          name: ctx.input.name,
          roles: ctx.input.roles,
          organisations: ctx.input.organisations,
          memberships: ctx.input.memberships
        });
        let data = result;
        return {
          output: { user: data, success: true },
          message: `Dashboard user created for **${ctx.input.email}**.`
        };
      }
      case 'list': {
        let result = await client.listDashboardUsers({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result;
        let users = readList(data, 'users');
        return {
          output: { users, success: true, ...listMetadata(data) },
          message: `Found **${users.length}** dashboard user(s).`
        };
      }
      case 'enable': {
        if (!username) throw createApiServiceError('username is required for enable action');
        let result = await client.enableDashboardUser(username);
        let data = result;
        return {
          output: { user: data, success: true },
          message: `Dashboard user **${username}** enabled.`
        };
      }
      case 'disable': {
        if (!username) throw createApiServiceError('username is required for disable action');
        let result = await client.disableDashboardUser(username);
        let data = result;
        return {
          output: { user: data, success: true },
          message: `Dashboard user **${username}** disabled.`
        };
      }
      case 'remove': {
        if (!username) throw createApiServiceError('username is required for remove action');
        await client.removeDashboardUser(username);
        return {
          output: { success: true },
          message: `Dashboard user **${username}** removed.`
        };
      }
    }
  })
  .build();
