import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let permissionSchema = z.object({
  permissionId: z.string().describe('Unique ID of the permission'),
  roles: z.array(z.string()).describe('Roles granted (read, write, owner)'),
  grantedToName: z.string().optional().describe('Display name of the grantee'),
  grantedToEmail: z.string().optional().describe('Email of the grantee'),
  linkUrl: z.string().optional().describe('Sharing link URL if this is a link permission'),
  linkType: z.string().optional().describe('Type of sharing link (view, edit, embed)'),
  linkScope: z
    .string()
    .optional()
    .describe('Scope of the link (anonymous, organization, users)'),
  expirationDateTime: z.string().optional().describe('When the permission expires')
});

export let managePermissionsTool = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `Lists or removes permissions on a file or folder in OneDrive or SharePoint. Use "list" action to see all sharing permissions and links, or "remove" to revoke a specific permission.`,
  instructions: [
    'Use action "list" to view all permissions on an item.',
    'Use action "remove" with a permissionId to revoke a specific permission.'
  ]
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      itemId: z.string().optional().describe('ID of the item'),
      itemPath: z.string().optional().describe('Path to the item'),
      action: z
        .enum(['list', 'remove'])
        .describe('"list" returns all permissions; "remove" deletes a specific permission'),
      permissionId: z
        .string()
        .optional()
        .describe('ID of the permission to remove (required for "remove" action)')
    })
  )
  .output(
    z.object({
      permissions: z
        .array(permissionSchema)
        .optional()
        .describe('List of permissions (for "list" action)'),
      removed: z
        .boolean()
        .optional()
        .describe('Whether the permission was removed (for "remove" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let perms = await client.listPermissions({
        driveId: ctx.input.driveId,
        itemId: ctx.input.itemId,
        itemPath: ctx.input.itemPath
      });

      let permissions = perms.map(p => ({
        permissionId: p.id,
        roles: p.roles,
        grantedToName: p.grantedTo?.user?.displayName,
        grantedToEmail: p.grantedTo?.user?.email,
        linkUrl: p.link?.webUrl,
        linkType: p.link?.type,
        linkScope: p.link?.scope,
        expirationDateTime: p.expirationDateTime
      }));

      return {
        output: { permissions },
        message: `Found **${permissions.length}** permission(s) on the item.`
      };
    }

    // Remove action
    if (!ctx.input.permissionId)
      throw new Error('permissionId is required for the "remove" action');
    if (!ctx.input.itemId) throw new Error('itemId is required for the "remove" action');

    await client.removePermission({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      permissionId: ctx.input.permissionId
    });

    return {
      output: { removed: true },
      message: `Permission **${ctx.input.permissionId}** removed.`
    };
  })
  .build();
