import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeamMember = SlateTool.create(spec, {
  name: 'Manage Team Member',
  key: 'manage_team_member',
  description: `Add, update, or remove a team member. Use "add" to invite a user, "update" to change their role, or "remove" to remove them from the team.`,
  instructions: [
    'For "add": provide username and optionally role (defaults to contributor).',
    'For "update": provide username and the new role.',
    'For "remove": only username is needed.'
  ]
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      action: z.enum(['add', 'update', 'remove']).describe('Action to perform'),
      username: z
        .string()
        .describe('Username or user identifier (e.g. "alice" or "id$abc123")'),
      role: z
        .enum(['owner', 'admin', 'manager', 'contributor', 'limited_contributor'])
        .optional()
        .describe('Role for the member (for add/update)')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Username of the member'),
      role: z.string().optional().describe('Current role (not returned on remove)'),
      removed: z.boolean().describe('Whether the member was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.action === 'add') {
      let member = await client.addTeamMember(ctx.input.teamSlug, {
        user: ctx.input.username,
        role: ctx.input.role
      });
      return {
        output: {
          username: member.user.username,
          role: member.role,
          removed: false
        },
        message: `Added **${member.user.username}** to team \`${ctx.input.teamSlug}\` as **${member.role}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.role) {
        throw new Error('role is required when updating a team member');
      }
      let member = await client.updateTeamMember(ctx.input.teamSlug, ctx.input.username, {
        role: ctx.input.role
      });
      return {
        output: {
          username: member.user.username,
          role: member.role,
          removed: false
        },
        message: `Updated **${member.user.username}** role to **${member.role}** in team \`${ctx.input.teamSlug}\`.`
      };
    }

    // remove
    await client.removeTeamMember(ctx.input.teamSlug, ctx.input.username);
    return {
      output: {
        username: ctx.input.username,
        removed: true
      },
      message: `Removed **${ctx.input.username}** from team \`${ctx.input.teamSlug}\`.`
    };
  })
  .build();
