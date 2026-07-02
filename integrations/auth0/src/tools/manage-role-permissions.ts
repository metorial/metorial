import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { requireNonEmptyArray } from '../lib/errors';
import { spec } from '../spec';
import { dispatchAuth0Action } from './shared';

let permissionSchema = z.object({
  resourceServerIdentifier: z
    .string()
    .describe('API identifier/audience that owns the permission'),
  permissionName: z.string().describe('Permission/scope name')
});

let mapPermission = (permission: any) => ({
  resourceServerIdentifier: permission.resource_server_identifier,
  resourceServerName: permission.resource_server_name,
  permissionName: permission.permission_name,
  description: permission.description
});

export let manageRolePermissionsTool = SlateTool.create(spec, {
  name: 'Manage Role Permissions',
  key: 'manage_role_permissions',
  description:
    'List, assign, or remove Auth0 permissions granted to a role. Permissions reference API resource-server identifiers and scope names.',
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roleId: z.string().describe('The Auth0 role ID'),
      action: z.enum(['list', 'assign', 'remove']).describe('Action to perform'),
      permissions: z
        .array(permissionSchema)
        .optional()
        .describe('Permissions to assign or remove; required for assign/remove'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      permissions: z
        .array(
          z.object({
            resourceServerIdentifier: z.string().optional(),
            resourceServerName: z.string().optional(),
            permissionName: z.string(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Role permissions for list action'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    return dispatchAuth0Action(ctx.input.action, {
      list: async () => {
        let result = await client.getRolePermissions(ctx.input.roleId, {
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });
        let permissions = (Array.isArray(result) ? result : (result.permissions ?? [])).map(
          mapPermission
        );
        return {
          output: { permissions, success: true },
          message: `Role has **${permissions.length}** permission(s).`
        };
      },

      assign: async () => {
        let permissions = requireNonEmptyArray(ctx.input.permissions, 'permissions', 'assign');
        await client.addRolePermissions(ctx.input.roleId, permissions);
        return {
          output: { success: true },
          message: `Assigned **${permissions.length}** permission(s) to role.`
        };
      },

      remove: async () => {
        let permissions = requireNonEmptyArray(ctx.input.permissions, 'permissions', 'remove');
        await client.removeRolePermissions(ctx.input.roleId, permissions);
        return {
          output: { success: true },
          message: `Removed **${permissions.length}** permission(s) from role.`
        };
      }
    });
  })
  .build();
