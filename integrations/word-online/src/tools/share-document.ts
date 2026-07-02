import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shareDocument = SlateTool.create(spec, {
  name: 'Share Document',
  key: 'share_document',
  description: `Share a Word document or file by creating a sharing link or inviting specific users.
Supports creating **view-only** or **edit** sharing links, and sending sharing invitations to specific email addresses with custom messages.`
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item to share'),
      method: z
        .enum(['link', 'invite'])
        .describe(
          'Sharing method: "link" creates a sharing link, "invite" sends an invitation to specific users'
        ),
      linkType: z
        .enum(['view', 'edit'])
        .optional()
        .describe(
          'For link sharing: whether the link grants view or edit access. Defaults to "view".'
        ),
      linkScope: z
        .enum(['anonymous', 'organization'])
        .optional()
        .describe(
          'For link sharing: "anonymous" allows anyone with the link, "organization" restricts to your organization. Defaults to "anonymous".'
        ),
      recipientEmail: z
        .string()
        .optional()
        .describe('For invite sharing: email address of the user to invite'),
      roles: z
        .array(z.enum(['read', 'write']))
        .optional()
        .describe('For invite sharing: roles to grant the recipient. Defaults to ["read"].'),
      message: z
        .string()
        .optional()
        .describe('For invite sharing: optional message to include in the invitation email')
    })
  )
  .output(
    z.object({
      permissionId: z.string().optional().describe('The ID of the created permission'),
      roles: z.array(z.string()).optional().describe('Roles granted by the permission'),
      sharingUrl: z.string().optional().describe('The sharing link URL (for link method)'),
      grantedTo: z
        .object({
          displayName: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
        .describe('User the permission was granted to (for invite method)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let { itemId, method } = ctx.input;

    if (method === 'link') {
      let linkType = ctx.input.linkType || 'view';
      let linkScope = ctx.input.linkScope || 'anonymous';
      let permission = await client.createSharingLink(itemId, linkType, linkScope);

      return {
        output: {
          permissionId: permission.permissionId,
          roles: permission.roles,
          sharingUrl: permission.link?.webUrl
        },
        message: `Created **${linkType}** sharing link${permission.link?.webUrl ? `: ${permission.link.webUrl}` : ''}`
      };
    } else {
      if (!ctx.input.recipientEmail)
        throw new Error('recipientEmail is required for invite method');
      let roles = ctx.input.roles || ['read'];
      let permissions = await client.inviteUser(
        itemId,
        ctx.input.recipientEmail,
        roles,
        ctx.input.message
      );
      let first = permissions[0];

      return {
        output: {
          permissionId: first?.permissionId,
          roles: first?.roles,
          grantedTo: first?.grantedTo
        },
        message: `Invited **${ctx.input.recipientEmail}** with **${roles.join(', ')}** access`
      };
    }
  })
  .build();
