import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let inviteTeamMember = SlateTool.create(spec, {
  name: 'Invite Team Member',
  key: 'invite_team_member',
  description: `Invite a new team member to your Feathery account with a specific role and granular permissions.`
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to invite'),
      role: z.enum(['admin', 'editor', 'viewer']).describe('Role to assign'),
      editFormResults: z.boolean().optional().describe('Permission to edit form results'),
      inviteCollaborators: z
        .boolean()
        .optional()
        .describe('Permission to invite collaborators'),
      editLogic: z.boolean().optional().describe('Permission to edit form logic'),
      editThemes: z.boolean().optional().describe('Permission to edit themes'),
      userGroups: z
        .array(z.string())
        .optional()
        .describe('User groups to assign the member to')
    })
  )
  .output(
    z.object({
      invited: z.boolean().describe('Whether the invitation was sent'),
      email: z.string().describe('Email of the invited member'),
      role: z.string().describe('Role assigned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let permissions: Record<string, boolean> = {};
    if (ctx.input.editFormResults !== undefined)
      permissions.edit_form_results = ctx.input.editFormResults;
    if (ctx.input.inviteCollaborators !== undefined)
      permissions.invite_collaborators = ctx.input.inviteCollaborators;
    if (ctx.input.editLogic !== undefined) permissions.edit_logic = ctx.input.editLogic;
    if (ctx.input.editThemes !== undefined) permissions.edit_themes = ctx.input.editThemes;

    await client.inviteTeamMember({
      email: ctx.input.email,
      role: ctx.input.role,
      permissions,
      userGroups: ctx.input.userGroups
    });

    return {
      output: {
        invited: true,
        email: ctx.input.email,
        role: ctx.input.role
      },
      message: `Invited **${ctx.input.email}** as **${ctx.input.role}**.`
    };
  })
  .build();

export let removeTeamMember = SlateTool.create(spec, {
  name: 'Remove Team Member',
  key: 'remove_team_member',
  description: `Remove a team member from your Feathery account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the team member to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the member was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.removeTeamMember(ctx.input.email);

    return {
      output: { removed: true },
      message: `Removed **${ctx.input.email}** from the team.`
    };
  })
  .build();
