import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let permissionSchema = z.object({
  permissionId: z.string(),
  role: z.string(),
  type: z.string(),
  emailAddress: z.string().optional(),
  domain: z.string().optional(),
  displayName: z.string().optional(),
  expirationTime: z.string().optional(),
  allowFileDiscovery: z.boolean().optional()
});

export let listPermissionsTool = SlateTool.create(spec, {
  name: 'List Permissions',
  key: 'list_permissions',
  description: `List all permissions (sharing settings) for a file or folder. Shows who has access and their role (owner, writer, commenter, reader).`,
  instructions: [
    'Requires access to the file metadata; you may see HTTP 403 for files you can open but cannot administer.',
    'Pagination: when using `pageToken`, use the same `fileId` as the request that returned the token.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listPermissions)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file or folder'),
      pageSize: z.number().optional().describe('Maximum number of permissions to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      permissions: z.array(permissionSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let result = await client.listPermissions(ctx.input.fileId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    return {
      output: result,
      message: `Found **${result.permissions.length}** permission(s) on file \`${ctx.input.fileId}\`.`
    };
  })
  .build();

export let shareFileTool = SlateTool.create(spec, {
  name: 'Share File',
  key: 'share_file',
  description: `Share a file or folder with a user, group, domain, or make it accessible to anyone with a link. Assigns a specific role (reader, commenter, writer, or owner) to the grantee.`,
  instructions: [
    'Type "user": share with a specific user by email. Type "group": share with a Google Group. Type "domain": share with an entire domain. Type "anyone": share with anyone (public or link-only).',
    'For type "anyone", set allowFileDiscovery to false to restrict access to only those with the link.'
  ]
})
  .scopes(googleDriveActionScopes.shareFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file or folder to share'),
      role: z
        .enum(['reader', 'commenter', 'writer', 'owner'])
        .describe('Permission role to grant'),
      type: z.enum(['user', 'group', 'domain', 'anyone']).describe('Type of grantee'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address (required for type "user" or "group")'),
      domain: z.string().optional().describe('Domain name (required for type "domain")'),
      allowFileDiscovery: z
        .boolean()
        .optional()
        .describe('Whether file can be discovered via search (for "domain" or "anyone")'),
      sendNotificationEmail: z
        .boolean()
        .optional()
        .describe('Send email notification to the grantee'),
      emailMessage: z
        .string()
        .optional()
        .describe('Custom message to include in the notification email'),
      transferOwnership: z
        .boolean()
        .optional()
        .describe('Transfer ownership (only when role is "owner")')
    })
  )
  .output(permissionSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let permission = await client.createPermission(ctx.input.fileId, {
      role: ctx.input.role,
      type: ctx.input.type,
      emailAddress: ctx.input.emailAddress,
      domain: ctx.input.domain,
      allowFileDiscovery: ctx.input.allowFileDiscovery,
      sendNotificationEmail: ctx.input.sendNotificationEmail,
      emailMessage: ctx.input.emailMessage,
      transferOwnership: ctx.input.transferOwnership
    });

    let target = ctx.input.emailAddress || ctx.input.domain || ctx.input.type;
    return {
      output: permission,
      message: `Shared file \`${ctx.input.fileId}\` with **${target}** as **${ctx.input.role}**.`
    };
  })
  .build();

export let updatePermissionTool = SlateTool.create(spec, {
  name: 'Update Permission',
  key: 'update_permission',
  description: `Change the role of an existing permission on a file or folder. Use **List Permissions** to find the permission ID.`
})
  .scopes(googleDriveActionScopes.updatePermission)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file or folder'),
      permissionId: z.string().describe('ID of the permission to update'),
      role: z
        .enum(['reader', 'commenter', 'writer', 'owner'])
        .describe('New role for the permission'),
      transferOwnership: z
        .boolean()
        .optional()
        .describe('Transfer ownership (required when changing role to "owner")')
    })
  )
  .output(permissionSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let permission = await client.updatePermission(ctx.input.fileId, ctx.input.permissionId, {
      role: ctx.input.role,
      transferOwnership: ctx.input.transferOwnership
    });

    return {
      output: permission,
      message: `Updated permission \`${ctx.input.permissionId}\` to **${ctx.input.role}** on file \`${ctx.input.fileId}\`.`
    };
  })
  .build();

export let removePermissionTool = SlateTool.create(spec, {
  name: 'Remove Permission',
  key: 'remove_permission',
  description: `Remove a permission (revoke access) from a file or folder. Use **List Permissions** to find the permission ID.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleDriveActionScopes.removePermission)
  .input(
    z.object({
      fileId: z.string().describe('ID of the file or folder'),
      permissionId: z.string().describe('ID of the permission to remove')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      permissionId: z.string(),
      removed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    await client.deletePermission(ctx.input.fileId, ctx.input.permissionId);

    return {
      output: {
        fileId: ctx.input.fileId,
        permissionId: ctx.input.permissionId,
        removed: true
      },
      message: `Removed permission \`${ctx.input.permissionId}\` from file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
