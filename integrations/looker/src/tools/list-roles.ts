import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let listRoles = SlateTool.create(spec, {
  name: 'List Roles',
  key: 'list_roles',
  description: `List all available roles in the Looker instance, or get details for a specific role. Roles define permission sets and model access that can be assigned to users and groups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roleId: z
        .string()
        .optional()
        .describe('Role ID to get details for a specific role. Omit to list all roles.')
    })
  )
  .output(
    z.object({
      roles: z
        .array(
          z.object({
            roleId: z.string().describe('Role ID'),
            name: z.string().optional().describe('Role name'),
            permissionSetName: z.string().optional().describe('Permission set name'),
            permissionSetId: z.string().optional().describe('Permission set ID'),
            modelSetName: z.string().optional().describe('Model set name'),
            modelSetId: z.string().optional().describe('Model set ID'),
            userCount: z.number().optional().describe('Number of users assigned this role')
          })
        )
        .describe('List of roles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.roleId) {
      let role = await client.getRole(ctx.input.roleId);
      let mapped = {
        roleId: String(role.id),
        name: role.name,
        permissionSetName: role.permission_set?.name,
        permissionSetId: role.permission_set?.id ? String(role.permission_set.id) : undefined,
        modelSetName: role.model_set?.name,
        modelSetId: role.model_set?.id ? String(role.model_set.id) : undefined,
        userCount: role.user_count
      };
      return {
        output: { roles: [mapped] },
        message: `Retrieved role **${role.name}**.`
      };
    }

    let roles = await client.listRoles();
    let mapped = (roles || []).map((r: any) => ({
      roleId: String(r.id),
      name: r.name,
      permissionSetName: r.permission_set?.name,
      permissionSetId: r.permission_set?.id ? String(r.permission_set.id) : undefined,
      modelSetName: r.model_set?.name,
      modelSetId: r.model_set?.id ? String(r.model_set.id) : undefined,
      userCount: r.user_count
    }));

    return {
      output: { roles: mapped },
      message: `Found **${mapped.length}** role(s).`
    };
  })
  .build();
