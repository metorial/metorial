import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireInput } from '../lib/inputs';
import { spec } from '../spec';

export let inviteMembers = SlateTool.create(spec, {
  name: 'Invite Members',
  key: 'invite_members',
  description: `Invite new members to your LaunchDarkly account. Each invitation must assign either one built-in role or one or more custom roles.`
})
  .input(
    z.object({
      members: z
        .array(
          z.object({
            email: z.string().describe('Email address to invite'),
            role: z
              .enum(['reader', 'writer', 'admin', 'owner/admin', 'no_access'])
              .optional()
              .describe('Built-in role to assign'),
            customRoles: z.array(z.string()).optional().describe('Custom role keys to assign'),
            roleAttributes: z
              .record(z.string(), z.array(z.string()))
              .optional()
              .describe('Role attribute values required by scoped preset roles')
          })
        )
        .min(1)
        .max(50)
        .describe('List of members to invite')
    })
  )
  .output(
    z.object({
      invitedCount: z.number().describe('Number of invitations sent'),
      invitedEmails: z.array(z.string()).describe('Emails that were invited'),
      invitedMembers: z
        .array(
          z.object({
            memberId: z.string().optional().describe('Created member ID'),
            email: z.string().describe('Invited email'),
            role: z.string().optional().describe('Assigned base role'),
            pendingInvite: z.boolean().optional().describe('Whether the invite is pending')
          })
        )
        .describe('Created member records returned by LaunchDarkly')
    })
  )
  .handleInvocation(async ctx => {
    for (let member of ctx.input.members) {
      requireInput(
        Boolean(member.role) !== Boolean(member.customRoles?.length),
        `Invite for ${member.email} must use exactly one of role or a non-empty customRoles list.`,
        'launchdarkly_member_role_conflict'
      );
    }

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let result = await client.inviteMembers(ctx.input.members);

    let items = result.items ?? result ?? [];
    let emails = Array.isArray(items)
      ? items.map((m: any) => m.email)
      : ctx.input.members.map(m => m.email);
    let invitedMembers = Array.isArray(items)
      ? items.map((member: any) => ({
          memberId: member._id,
          email: member.email,
          role: member.role,
          pendingInvite: member._pendingInvite
        }))
      : ctx.input.members.map(member => ({
          email: member.email,
          role: member.role
        }));

    return {
      output: {
        invitedCount: emails.length,
        invitedEmails: emails,
        invitedMembers
      },
      message: `Invited **${emails.length}** member(s): ${emails.join(', ')}.`
    };
  })
  .build();
