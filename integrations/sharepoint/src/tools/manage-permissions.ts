import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let getPermissionPrincipal = (permission: any) => {
  let identities = [
    permission.grantedToV2,
    ...(permission.grantedToIdentitiesV2 || []),
    permission.grantedTo,
    ...(permission.grantedToIdentities || [])
  ].filter(Boolean);

  for (let identity of identities) {
    let principal =
      identity.user ||
      identity.siteUser ||
      identity.group ||
      identity.siteGroup ||
      identity.application ||
      identity.device;
    if (principal) {
      return principal;
    }
  }

  return null;
};

let permissionOutputSchema = z.object({
  permissionId: z.string().describe('Permission ID'),
  roles: z
    .array(z.string())
    .optional()
    .describe('Permission roles (e.g. "read", "write", "owner")'),
  grantedTo: z.string().optional().describe('User or group the permission is granted to'),
  grantedToEmail: z
    .string()
    .optional()
    .describe('Email of the user the permission is granted to'),
  linkType: z.string().optional().describe('Type of sharing link (if applicable)'),
  linkScope: z.string().optional().describe('Scope of sharing link'),
  linkUrl: z.string().optional().describe('URL of the sharing link'),
  expirationDateTime: z.string().optional().describe('When the permission expires')
});

export let managePermissions = SlateTool.create(spec, {
  name: 'Manage Permissions',
  key: 'manage_permissions',
  description: `View, grant, and revoke permissions on SharePoint files and folders. Create sharing links, invite users with specific roles, list current permissions, or remove a permission. Works with drive items in document libraries.`,
  instructions: [
    'Set **action** to "list" to see all current permissions on an item.',
    'Set **action** to "createLink" to generate a sharing link. Specify **linkType** (view/edit) and **linkScope** (anonymous/organization/users).',
    'Set **action** to "invite" to grant access to specific users by email with specified roles.',
    'Set **action** to "delete" to revoke a specific permission by its ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'createLink', 'invite', 'delete'])
        .describe('Permission action to perform'),
      driveId: z.string().describe('Drive ID containing the item'),
      itemId: z.string().describe('Drive item ID to manage permissions for'),
      linkType: z
        .enum(['view', 'edit', 'embed'])
        .optional()
        .describe('Type of sharing link (for createLink)'),
      linkScope: z
        .enum(['anonymous', 'organization', 'users'])
        .optional()
        .describe('Scope of the sharing link (for createLink)'),
      linkExpiration: z
        .string()
        .optional()
        .describe('Expiration datetime in ISO 8601 format (for createLink)'),
      linkPassword: z
        .string()
        .optional()
        .describe('Password for the sharing link (for createLink)'),
      recipientEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to invite (for invite)'),
      roles: z
        .array(z.enum(['read', 'write', 'owner']))
        .optional()
        .describe('Roles to assign to invitees (for invite)'),
      inviteMessage: z
        .string()
        .optional()
        .describe('Message to include in the invitation email (for invite)'),
      sendInvitation: z
        .boolean()
        .optional()
        .describe('Whether to send an email notification (for invite, default true)'),
      permissionId: z
        .string()
        .optional()
        .describe('Permission ID to delete (for delete action)')
    })
  )
  .output(
    z.object({
      permissions: z.array(permissionOutputSchema).optional().describe('List of permissions'),
      permission: permissionOutputSchema.optional().describe('Created or updated permission'),
      deleted: z.boolean().optional().describe('Whether the permission was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let { action, driveId, itemId } = ctx.input;

    let mapPermission = (p: any) => {
      let principal = getPermissionPrincipal(p);
      return {
        permissionId: p.id,
        roles: p.roles,
        grantedTo:
          principal?.displayName ||
          principal?.loginName ||
          principal?.email ||
          principal?.userPrincipalName ||
          principal?.id,
        grantedToEmail: principal?.email || principal?.userPrincipalName,
        linkType: p.link?.type,
        linkScope: p.link?.scope,
        linkUrl: p.link?.webUrl,
        expirationDateTime: p.expirationDateTime
      };
    };

    switch (action) {
      case 'list': {
        let data = await client.getDriveItemPermissions(driveId, itemId);
        let permissions = (data.value || []).map(mapPermission);
        return {
          output: { permissions },
          message: `Found **${permissions.length}** permission(s) on the item.`
        };
      }

      case 'createLink': {
        if (!ctx.input.linkType) throw new Error('linkType is required for createLink.');
        if (!ctx.input.linkScope) throw new Error('linkScope is required for createLink.');
        let perm = await client.createSharingLink(
          driveId,
          itemId,
          ctx.input.linkType,
          ctx.input.linkScope,
          ctx.input.linkExpiration,
          ctx.input.linkPassword
        );
        return {
          output: { permission: mapPermission(perm) },
          message: `Created **${ctx.input.linkType}** sharing link with **${ctx.input.linkScope}** scope.`
        };
      }

      case 'invite': {
        if (!ctx.input.recipientEmails || ctx.input.recipientEmails.length === 0) {
          throw new Error('recipientEmails are required for invite.');
        }
        let roles = ctx.input.roles || ['read'];
        let data = await client.inviteToItem(
          driveId,
          itemId,
          ctx.input.recipientEmails.map(email => ({ email })),
          roles,
          ctx.input.inviteMessage,
          true,
          ctx.input.sendInvitation
        );
        let permissions = (data.value || []).map(mapPermission);
        return {
          output: { permissions },
          message: `Invited **${ctx.input.recipientEmails.length}** user(s) with **${roles.join(', ')}** role(s).`
        };
      }

      case 'delete': {
        if (!ctx.input.permissionId) throw new Error('permissionId is required for delete.');
        await client.deletePermission(driveId, itemId, ctx.input.permissionId);
        return {
          output: { deleted: true },
          message: `Deleted permission \`${ctx.input.permissionId}\`.`
        };
      }
    }
  })
  .build();
