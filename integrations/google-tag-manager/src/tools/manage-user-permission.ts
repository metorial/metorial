import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let containerAccessSchema = z.object({
  containerId: z.string().describe('Container ID'),
  permission: z
    .enum(['noAccess', 'read', 'edit', 'approve', 'publish'])
    .describe('Permission level for the container')
});

let userPermissionOutputSchema = z.object({
  permissionId: z.string().optional().describe('User permission ID (extracted from path)'),
  accountId: z.string().optional().describe('Account ID'),
  emailAddress: z.string().optional().describe('User email address'),
  accountAccess: z
    .object({
      permission: z.string().optional().describe('Account-level permission')
    })
    .optional()
    .describe('Account-level access'),
  containerAccess: z
    .array(
      z.object({
        containerId: z.string().optional().describe('Container ID'),
        permission: z.string().optional().describe('Container-level permission')
      })
    )
    .optional()
    .describe('Container-level access entries')
});

export let manageUserPermission = SlateTool.create(spec, {
  name: 'Manage User Permission',
  key: 'manage_user_permission',
  description: `Create, list, get, update, or delete user permissions for a GTM account. Permissions control who can access and modify your GTM accounts and containers.`,
  instructions: [
    'Account-level permissions: "noAccess", "read", "admin".',
    'Container-level permissions: "noAccess", "read", "edit", "approve", "publish".',
    'The permissionId is derived from the user permission path — use "list" to find it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageUserPermission)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      permissionId: z
        .string()
        .optional()
        .describe('User permission ID (required for get, update, delete)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address of the user (required for create)'),
      accountPermission: z
        .enum(['noAccess', 'read', 'admin'])
        .optional()
        .describe('Account-level permission'),
      containerAccess: z
        .array(containerAccessSchema)
        .optional()
        .describe('Container-level permission entries')
    })
  )
  .output(
    z.object({
      permission: userPermissionOutputSchema.optional().describe('User permission details'),
      permissions: z
        .array(userPermissionOutputSchema)
        .optional()
        .describe('List of user permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, permissionId } = ctx.input;

    if (action === 'list') {
      let response = await client.listUserPermissions(accountId);
      let permissions = (response.userPermission || []).map(p => ({
        ...p,
        permissionId: p.path?.split('/').pop()
      }));
      return {
        output: { permissions } as any,
        message: `Found **${permissions.length}** user permission(s) for account \`${accountId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.emailAddress)
        throw new Error('emailAddress is required for creating a user permission');

      let permissionData: {
        emailAddress: string;
        accountAccess?: { permission: string };
        containerAccess?: Array<{ containerId: string; permission: string }>;
      } = {
        emailAddress: ctx.input.emailAddress
      };

      if (ctx.input.accountPermission) {
        permissionData.accountAccess = { permission: ctx.input.accountPermission };
      }
      if (ctx.input.containerAccess) {
        permissionData.containerAccess = ctx.input.containerAccess;
      }

      let permission = await client.createUserPermission(accountId, permissionData);
      return {
        output: {
          permission: {
            ...permission,
            permissionId: permission.path?.split('/').pop()
          }
        } as any,
        message: `Created permission for **${ctx.input.emailAddress}** on account \`${accountId}\``
      };
    }

    if (!permissionId)
      throw new Error('permissionId is required for get, update, and delete actions');

    if (action === 'get') {
      let permission = await client.getUserPermission(accountId, permissionId);
      return {
        output: {
          permission: {
            ...permission,
            permissionId: permission.path?.split('/').pop()
          }
        } as any,
        message: `Retrieved permission for **${permission.emailAddress}**`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.accountPermission) {
        updateData.accountAccess = { permission: ctx.input.accountPermission };
      }
      if (ctx.input.containerAccess) {
        updateData.containerAccess = ctx.input.containerAccess;
      }

      let permission = await client.updateUserPermission(accountId, permissionId, updateData);
      return {
        output: {
          permission: {
            ...permission,
            permissionId: permission.path?.split('/').pop()
          }
        } as any,
        message: `Updated permission for **${permission.emailAddress}**`
      };
    }

    // delete
    await client.deleteUserPermission(accountId, permissionId);
    return {
      output: { permission: { permissionId, accountId } } as any,
      message: `Deleted user permission \`${permissionId}\` from account \`${accountId}\``
    };
  })
  .build();
