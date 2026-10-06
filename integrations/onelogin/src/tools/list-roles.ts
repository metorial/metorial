import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { publicPagination } from '../lib/contracts';
import { spec } from '../spec';

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List roles in OneLogin. Roles control user access to applications. Filter by name, app ID, or app name. Optionally include associated apps, users, and admins.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      afterCursor: z
        .string()
        .optional()
        .describe('Opaque next cursor; repeat the same filters. Do not combine with page.'),
      page: z
        .number()
        .optional()
        .describe('Positive page number; do not combine with afterCursor.'),
      limit: z.number().optional().describe('Page size, maximum 650'),
      name: z.string().optional().describe('Filter by role name'),
      appId: z.number().optional().describe('Filter roles containing this app ID'),
      appName: z.string().optional().describe('Filter roles containing this app name'),
      includeFields: z
        .array(z.enum(['apps', 'users', 'admins']))
        .optional()
        .describe('Additional fields to include in the response')
    })
  )
  .output(
    z.object({
      afterCursor: z
        .string()
        .nullable()
        .describe('Native next cursor, or null when none is supplied'),
      pagination: publicPagination,
      roles: z
        .array(
          z.object({
            roleId: z.number().describe('Role ID'),
            name: z.string().describe('Role name'),
            apps: z.array(z.number()).optional().describe('App IDs associated with this role'),
            users: z.array(z.number()).optional().describe('User IDs assigned to this role'),
            admins: z.array(z.number()).optional().describe('Admin user IDs for this role')
          })
        )
        .describe('List of roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = OneLoginClient.fromContext(ctx);

    let params: Record<string, string | number | undefined> = {
      cursor: ctx.input.afterCursor,
      page: ctx.input.page,
      limit: ctx.input.limit
    };
    if (ctx.input.name !== undefined) params.name = ctx.input.name;
    if (ctx.input.appId !== undefined) params.app_id = ctx.input.appId;
    if (ctx.input.appName !== undefined) params.app_name = ctx.input.appName;
    if (ctx.input.includeFields && ctx.input.includeFields.length > 0) {
      params.fields = ctx.input.includeFields.join(',');
    }

    let data = await client.listRoles(params);
    let roles = data.data;

    let mapped = roles.map(r => ({
      roleId: r.id,
      name: r.name,
      apps: r.apps,
      users: r.users,
      admins: r.admins
    }));

    return {
      output: {
        roles: mapped,
        afterCursor: data.pagination.afterCursor,
        pagination: data.pagination
      },
      message: `Found **${mapped.length}** on this page; role(s).`
    };
  });
