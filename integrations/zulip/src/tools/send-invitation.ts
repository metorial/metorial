import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInvitation = SlateTool.create(spec, {
  name: 'Send Invitation',
  key: 'send_invitation',
  description: `Invite new users to the Zulip organization by email. Can also create reusable invitation links.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['email', 'link'])
        .describe(
          '"email" to send invitation emails, "link" to create a reusable invitation link'
        ),
      emails: z
        .string()
        .optional()
        .describe('Comma-separated email addresses to invite (required for "email" type)'),
      channelIds: z
        .array(z.number())
        .describe('Channel IDs to auto-subscribe the invited users to'),
      includeDefaultChannels: z
        .boolean()
        .optional()
        .describe('Whether to also subscribe invitees to default channels'),
      expiresInMinutes: z
        .number()
        .optional()
        .describe('Number of minutes until the invitation expires')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the invitation was sent successfully'),
      inviteLink: z.string().optional().describe('The reusable invite link (for "link" type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    if (ctx.input.type === 'email') {
      await client.sendInvitations({
        inviteeEmails: ctx.input.emails!,
        streamIds: ctx.input.channelIds,
        includeRealmDefaultSubscriptions: ctx.input.includeDefaultChannels,
        inviteExpiresInMinutes: ctx.input.expiresInMinutes
      });

      return {
        output: { success: true },
        message: `Invitation emails sent successfully`
      };
    } else {
      let result = await client.createReusableInviteLink({
        streamIds: ctx.input.channelIds,
        includeRealmDefaultSubscriptions: ctx.input.includeDefaultChannels,
        inviteExpiresInMinutes: ctx.input.expiresInMinutes
      });

      return {
        output: {
          success: true,
          inviteLink: result.invite_link
        },
        message: `Reusable invite link created: ${result.invite_link}`
      };
    }
  })
  .build();
