import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

const outputSchema = z.object({
  members: z
    .array(
      z.object({
        username: z.string(),
        role: z.string(),
        email: z.string().optional()
      })
    )
    .optional()
    .describe('List of members'),
  invites: z
    .array(
      z.object({
        email: z.string(),
        role: z.string(),
        accepted: z.boolean(),
        createdAt: z.string().optional()
      })
    )
    .optional()
    .describe('List of invites'),
  actionResult: z.string().optional().describe('Description of the action performed')
});

export let manageMembers = SlateTool.create(spec, {
  tags: { readOnly: false, destructive: true },
  name: 'Manage Members',
  key: 'manage_members',
  description: `Choose an organization with list_organizations. List, add, or remove members from the organization. Can also invite users by email.`,
  instructions: [
    'Use action "list" to see all current members.',
    'Use action "add" to add a member by username.',
    'Use action "remove" to remove a member.',
    'Use action "invite" to invite a user by email.',
    'Use action "list_invites" to see pending invitations.',
    'Use action "delete_invite" to cancel a pending invitation.'
  ]
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      action: z
        .enum(['list', 'add', 'remove', 'invite', 'list_invites', 'delete_invite'])
        .describe('Action to perform'),
      username: z
        .string()
        .optional()
        .describe('Username of the member (for add/remove actions)'),
      email: z
        .string()
        .optional()
        .describe('Email address (for invite/delete_invite actions)'),
      role: z
        .enum(['admin', 'member', 'viewer'])
        .optional()
        .describe('Role for the member or invite (for add/invite actions)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let output: z.infer<typeof outputSchema> = {};
    let message = '';

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listMembers();
        output.members = result.members.map(m => ({
          username: m.username,
          role: m.role,
          email: m.email
        }));
        message = `Found **${result.members.length}** member(s).`;
        break;
      }
      case 'add': {
        if (!ctx.input.username || !ctx.input.role) {
          throw createApiServiceError('Username and role are required for adding a member.');
        }
        await client.addMember(ctx.input.username, ctx.input.role);
        output.actionResult = `Added ${ctx.input.username} as ${ctx.input.role}`;
        message = `Added **${ctx.input.username}** as **${ctx.input.role}**.`;
        break;
      }
      case 'remove': {
        if (!ctx.input.username) {
          throw createApiServiceError('Username is required for removing a member.');
        }
        await client.removeMember(ctx.input.username);
        output.actionResult = `Removed ${ctx.input.username}`;
        message = `Removed member **${ctx.input.username}**.`;
        break;
      }
      case 'invite': {
        if (!ctx.input.email || !ctx.input.role) {
          throw createApiServiceError('Email and role are required for inviting a user.');
        }
        await client.createInvite(ctx.input.email, ctx.input.role);
        output.actionResult = `Invited ${ctx.input.email} as ${ctx.input.role}`;
        message = `Invited **${ctx.input.email}** as **${ctx.input.role}**.`;
        break;
      }
      case 'list_invites': {
        let result = await client.listInvites();
        output.invites = result.invites.map(inv => ({
          email: inv.email,
          role: inv.role,
          accepted: false,
          createdAt: inv.created_at
        }));
        message = `Found **${result.invites.length}** pending invite(s).`;
        break;
      }
      case 'delete_invite': {
        if (!ctx.input.email) {
          throw createApiServiceError('Email is required for deleting an invite.');
        }
        await client.deleteInvite(ctx.input.email);
        output.actionResult = `Deleted invite for ${ctx.input.email}`;
        message = `Deleted invite for **${ctx.input.email}**.`;
        break;
      }
    }

    return {
      output,
      message
    };
  })
  .build();
