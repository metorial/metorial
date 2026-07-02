import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPermissionsTool = SlateTool.create(spec, {
  name: 'List Permissions',
  key: 'list_permissions',
  description: `List permissions in Airbyte. Filter by user or organization to see role-based access assignments across workspaces and organizations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter permissions by user UUID.'),
      organizationId: z
        .string()
        .optional()
        .describe(
          "Organization UUID. Required to view another user's permissions (must be org admin or higher)."
        )
    })
  )
  .output(
    z.object({
      permissions: z.array(
        z.object({
          permissionId: z.string(),
          permissionType: z.string(),
          userId: z.string(),
          scope: z.string(),
          scopeId: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listPermissions({
      userId: ctx.input.userId,
      organizationId: ctx.input.organizationId
    });

    return {
      output: {
        permissions: result.data.map(p => ({
          permissionId: p.permissionId,
          permissionType: p.permissionType,
          userId: p.userId,
          scope: p.scope,
          scopeId: p.scopeId
        }))
      },
      message: `Found **${result.data.length}** permission(s).`
    };
  })
  .build();

export let createPermissionTool = SlateTool.create(spec, {
  name: 'Create Permission',
  key: 'create_permission',
  description: `Grant a permission to a user in Airbyte. Permissions are scoped to either a workspace or organization and define the user's role (admin, editor, reader, etc.).`
})
  .input(
    z.object({
      userId: z.string().describe('UUID of the user to grant permission to.'),
      permissionType: z
        .enum([
          'instance_admin',
          'organization_admin',
          'organization_editor',
          'organization_reader',
          'organization_member',
          'workspace_admin',
          'workspace_editor',
          'workspace_reader'
        ])
        .describe('The permission role to grant.'),
      workspaceId: z
        .string()
        .optional()
        .describe('UUID of the workspace (for workspace-scoped permissions).'),
      organizationId: z
        .string()
        .optional()
        .describe('UUID of the organization (for organization-scoped permissions).')
    })
  )
  .output(
    z.object({
      permissionId: z.string(),
      permissionType: z.string(),
      userId: z.string(),
      scope: z.string(),
      scopeId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let permission = await client.createPermission({
      userId: ctx.input.userId,
      permissionType: ctx.input.permissionType,
      workspaceId: ctx.input.workspaceId,
      organizationId: ctx.input.organizationId
    });

    return {
      output: {
        permissionId: permission.permissionId,
        permissionType: permission.permissionType,
        userId: permission.userId,
        scope: permission.scope,
        scopeId: permission.scopeId
      },
      message: `Created permission **${permission.permissionType}** for user ${permission.userId} (ID: ${permission.permissionId}).`
    };
  })
  .build();

export let deletePermissionTool = SlateTool.create(spec, {
  name: 'Delete Permission',
  key: 'delete_permission',
  description: `Revoke a permission from a user in Airbyte. Permanently removes the specified permission.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      permissionId: z.string().describe('The UUID of the permission to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deletePermission(ctx.input.permissionId);

    return {
      output: { success: true },
      message: `Deleted permission ${ctx.input.permissionId}.`
    };
  })
  .build();
