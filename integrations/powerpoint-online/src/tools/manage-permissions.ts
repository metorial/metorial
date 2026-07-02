import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

let permissionDetailSchema = z.object({
  permissionId: z.string().optional().describe('ID of the permission'),
  roles: z.array(z.string()).optional().describe('Roles granted'),
  sharingUrl: z.string().optional().describe('Sharing link URL'),
  linkType: z.string().optional().describe('Type of sharing link'),
  linkScope: z.string().optional().describe('Scope of the sharing link'),
  grantedToEmail: z.string().optional().describe('Email of the user granted access'),
  grantedToName: z.string().optional().describe('Display name of the user granted access')
});

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `List or revoke sharing permissions on a file in OneDrive or SharePoint. Use "list" to see all current permissions, or "revoke" to remove a specific permission by its ID.`
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'revoke'])
        .describe('Operation to perform: "list" to view permissions, "revoke" to remove one.'),
      itemId: z.string().describe('ID of the file or folder.'),
      driveId: z.string().optional().describe('ID of the drive containing the item.'),
      siteId: z.string().optional().describe('SharePoint site ID.'),
      permissionId: z
        .string()
        .optional()
        .describe('ID of the permission to revoke. Required for "revoke" operation.')
    })
  )
  .output(
    z.object({
      permissions: z
        .array(permissionDetailSchema)
        .optional()
        .describe('Current permissions (for list operation)'),
      revoked: z
        .boolean()
        .optional()
        .describe('Whether the permission was revoked (for revoke operation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    if (ctx.input.operation === 'revoke') {
      if (!ctx.input.permissionId) {
        throw new Error('permissionId is required for revoke operation');
      }

      await client.deletePermission({
        itemId: ctx.input.itemId,
        permissionId: ctx.input.permissionId,
        driveId: ctx.input.driveId,
        siteId: ctx.input.siteId
      });

      return {
        output: { revoked: true },
        message: `Permission **${ctx.input.permissionId}** revoked`
      };
    }

    let permissions = await client.listPermissions({
      itemId: ctx.input.itemId,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId
    });

    let output = permissions.map(p => ({
      permissionId: p.id,
      roles: p.roles,
      sharingUrl: p.link?.webUrl,
      linkType: p.link?.type,
      linkScope: p.link?.scope,
      grantedToEmail: p.grantedTo?.user?.email,
      grantedToName: p.grantedTo?.user?.displayName
    }));

    return {
      output: { permissions: output },
      message: `Found **${output.length}** permission(s)`
    };
  })
  .build();
