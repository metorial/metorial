import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let inviteMembers = SlateTool.create(spec, {
  name: 'Invite Members',
  key: 'invite_members',
  description: `Invite new members to your LaunchDarkly account. Send invitations by email and optionally assign a built-in role or custom roles.`
})
  .input(
    z.object({
      members: z
        .array(
          z.object({
            email: z.string().describe('Email address to invite'),
            role: z
              .enum(['reader', 'writer', 'admin'])
              .optional()
              .describe('Built-in role to assign'),
            customRoles: z.array(z.string()).optional().describe('Custom role keys to assign')
          })
        )
        .describe('List of members to invite')
    })
  )
  .output(
    z.object({
      invitedCount: z.number().describe('Number of invitations sent'),
      invitedEmails: z.array(z.string()).describe('Emails that were invited')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.inviteMembers(ctx.input.members);

    let items = result.items ?? result ?? [];
    let emails = Array.isArray(items)
      ? items.map((m: any) => m.email)
      : ctx.input.members.map(m => m.email);

    return {
      output: {
        invitedCount: emails.length,
        invitedEmails: emails
      },
      message: `Invited **${emails.length}** member(s): ${emails.join(', ')}.`
    };
  })
  .build();
