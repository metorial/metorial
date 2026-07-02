import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

let permissionOutputSchema = z.object({
  permissionId: z.string().optional().describe('ID of the created permission'),
  roles: z.array(z.string()).optional().describe('Roles granted by this permission'),
  sharingUrl: z.string().optional().describe('Sharing link URL (for link-based sharing)'),
  linkType: z.string().optional().describe('Type of sharing link'),
  linkScope: z.string().optional().describe('Scope of the sharing link'),
  grantedToEmail: z.string().optional().describe('Email address of the user granted access'),
  grantedToName: z.string().optional().describe('Display name of the user granted access')
});

export let shareFile = SlateTool.create(spec, {
  name: 'Share File',
  key: 'share_file',
  description: `Share a PowerPoint presentation or other file by creating a sharing link or inviting specific users. Supports view-only, edit, and embed link types with configurable scope. Can also invite users directly with specified roles.`,
  instructions: [
    'Use "link" shareType to create a sharing link (anonymous, organization-wide, or user-specific).',
    'Use "invite" shareType to grant access to specific users by email.'
  ]
})
  .input(
    z.object({
      itemId: z
        .string()
        .optional()
        .describe('ID of the file to share. Provide either itemId or itemPath.'),
      itemPath: z.string().optional().describe('Path to the file to share.'),
      driveId: z.string().optional().describe('ID of the drive containing the item.'),
      siteId: z.string().optional().describe('SharePoint site ID.'),
      shareType: z
        .enum(['link', 'invite'])
        .describe(
          'How to share: "link" creates a sharing link, "invite" sends invitations to specific users.'
        ),
      linkType: z
        .enum(['view', 'edit', 'embed'])
        .optional()
        .describe('Type of sharing link. Required for "link" shareType.'),
      linkScope: z
        .enum(['anonymous', 'organization', 'users'])
        .optional()
        .describe('Who can use the sharing link.'),
      password: z.string().optional().describe('Password to protect the sharing link.'),
      expirationDateTime: z
        .string()
        .optional()
        .describe('ISO 8601 expiration time for the sharing link.'),
      recipientEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses of users to invite. Required for "invite" shareType.'),
      roles: z
        .array(z.enum(['read', 'write', 'owner']))
        .optional()
        .describe(
          'Roles to grant invited users. Default: ["read"]. Required for "invite" shareType.'
        ),
      invitationMessage: z
        .string()
        .optional()
        .describe('Custom message included in the invitation email.'),
      sendNotification: z
        .boolean()
        .optional()
        .describe('Whether to send an email notification to invited users. Default: true.')
    })
  )
  .output(
    z.object({
      permissions: z.array(permissionOutputSchema).describe('Created permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    if (ctx.input.shareType === 'link') {
      if (!ctx.input.linkType) {
        throw new Error('linkType is required when shareType is "link"');
      }

      let permission = await client.createSharingLink({
        itemId: ctx.input.itemId,
        itemPath: ctx.input.itemPath,
        driveId: ctx.input.driveId,
        siteId: ctx.input.siteId,
        linkType: ctx.input.linkType,
        scope: ctx.input.linkScope,
        password: ctx.input.password,
        expirationDateTime: ctx.input.expirationDateTime
      });

      return {
        output: {
          permissions: [
            {
              permissionId: permission.id,
              roles: permission.roles,
              sharingUrl: permission.link?.webUrl,
              linkType: permission.link?.type,
              linkScope: permission.link?.scope
            }
          ]
        },
        message: `Created **${ctx.input.linkType}** sharing link${permission.link?.webUrl ? `: ${permission.link.webUrl}` : ''}`
      };
    }

    if (!ctx.input.recipientEmails || ctx.input.recipientEmails.length === 0) {
      throw new Error('recipientEmails is required when shareType is "invite"');
    }

    let permissions = await client.inviteUsers({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId,
      recipients: ctx.input.recipientEmails.map(email => ({ email })),
      roles: ctx.input.roles || ['read'],
      message: ctx.input.invitationMessage,
      sendInvitation: ctx.input.sendNotification ?? true
    });

    let output = permissions.map(p => ({
      permissionId: p.id,
      roles: p.roles,
      grantedToEmail: p.grantedTo?.user?.email || p.invitation?.email,
      grantedToName: p.grantedTo?.user?.displayName
    }));

    return {
      output: { permissions: output },
      message: `Invited **${ctx.input.recipientEmails.length}** user(s)`
    };
  })
  .build();
