import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
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
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let params: Record<string, string | number | undefined> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.appId) params.app_id = ctx.input.appId;
    if (ctx.input.appName) params.app_name = ctx.input.appName;
    if (ctx.input.includeFields && ctx.input.includeFields.length > 0) {
      params.fields = ctx.input.includeFields.join(',');
    }

    let data = await client.listRoles(params);
    let roles = Array.isArray(data) ? data : data.data || [];

    let mapped = roles.map((r: any) => ({
      roleId: r.id,
      name: r.name,
      apps: r.apps,
      users: r.users,
      admins: r.admins
    }));

    return {
      output: { roles: mapped },
      message: `Found **${mapped.length}** role(s).`
    };
  });
