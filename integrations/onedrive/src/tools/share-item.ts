import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let shareItemTool = SlateTool.create(spec, {
  name: 'Share File or Folder',
  key: 'share_item',
  description: `Creates a sharing link or sends sharing invitations for a file or folder in OneDrive or SharePoint. Can create anonymous, organization-wide, or user-specific links with read or edit access. Can also invite specific users by email.`,
  instructions: [
    'Provide either itemId or itemPath to identify the item.',
    'Use "link" mode to create a sharing link, or "invite" mode to send email invitations to specific users.'
  ]
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe("ID of the drive. Defaults to the user's personal OneDrive."),
      itemId: z.string().optional().describe('ID of the item to share'),
      itemPath: z.string().optional().describe('Path to the item to share'),
      mode: z
        .enum(['link', 'invite'])
        .describe(
          '"link" creates a sharing link; "invite" sends email invitations to specific users'
        ),

      // Link options
      linkType: z
        .enum(['view', 'edit', 'embed'])
        .optional()
        .describe('Type of sharing link to create (required for "link" mode)'),
      linkScope: z
        .enum(['anonymous', 'organization', 'users'])
        .optional()
        .describe('Who can use the sharing link'),
      expirationDateTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the link expires'),
      password: z.string().optional().describe('Password to access the shared link'),

      // Invite options
      recipientEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to invite (required for "invite" mode)'),
      role: z
        .enum(['read', 'write'])
        .optional()
        .describe('Permission role for invited users (required for "invite" mode)'),
      message: z
        .string()
        .optional()
        .describe('Personal message included in the invitation email'),
      sendInvitation: z
        .boolean()
        .optional()
        .describe('Whether to send an email notification. Defaults to true.')
    })
  )
  .output(
    z.object({
      shareLink: z.string().optional().describe('URL of the created sharing link'),
      shareId: z.string().optional().describe('ID of the sharing permission'),
      roles: z.array(z.string()).optional().describe('Granted roles'),
      scope: z
        .string()
        .optional()
        .describe('Scope of the sharing link (anonymous, organization, users)'),
      invitedUsers: z
        .array(z.string())
        .optional()
        .describe('Email addresses that were invited')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'link') {
      if (!ctx.input.linkType) throw new Error('linkType is required when mode is "link"');

      let link = await client.createSharingLink({
        driveId: ctx.input.driveId,
        itemId: ctx.input.itemId,
        itemPath: ctx.input.itemPath,
        type: ctx.input.linkType,
        scope: ctx.input.linkScope,
        expirationDateTime: ctx.input.expirationDateTime,
        password: ctx.input.password
      });

      return {
        output: {
          shareLink: link.link.webUrl,
          shareId: link.id,
          roles: link.roles,
          scope: link.link.scope
        },
        message: `Created **${ctx.input.linkType}** sharing link (${link.link.scope}): ${link.link.webUrl}`
      };
    }

    // Invite mode
    if (!ctx.input.recipientEmails?.length)
      throw new Error('recipientEmails is required when mode is "invite"');
    if (!ctx.input.role) throw new Error('role is required when mode is "invite"');

    let permissions = await client.addPermission({
      driveId: ctx.input.driveId,
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      recipients: ctx.input.recipientEmails.map(email => ({ email })),
      roles: [ctx.input.role],
      message: ctx.input.message,
      sendInvitation: ctx.input.sendInvitation
    });

    return {
      output: {
        invitedUsers: ctx.input.recipientEmails,
        roles: [ctx.input.role],
        shareId: permissions[0]?.id
      },
      message: `Invited **${ctx.input.recipientEmails.length}** user(s) with **${ctx.input.role}** access.`
    };
  })
  .build();
