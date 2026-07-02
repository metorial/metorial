import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { vercelServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTeamsTool = SlateTool.create(spec, {
  name: 'Manage Teams',
  key: 'manage_teams',
  description: `List teams, get team details, and manage team members. View team information, list members, invite new members, or remove existing ones.`,
  instructions: [
    'Use action "list_teams" to list all teams the user belongs to.',
    'Use action "get_team" to get details for a specific team.',
    'Use action "list_members" to list members of a team.',
    'Use action "invite_member" to invite a user by email.',
    'Use action "remove_member" to remove a member by user ID.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list_teams', 'get_team', 'list_members', 'invite_member', 'remove_member'])
        .describe('Action to perform'),
      teamId: z.string().optional().describe('Team ID (required for team-specific actions)'),
      email: z.string().optional().describe('Email address (required for invite_member)'),
      userId: z.string().optional().describe('User ID (required for remove_member)'),
      role: z
        .enum(['OWNER', 'MEMBER', 'DEVELOPER', 'VIEWER', 'BILLING'])
        .optional()
        .describe('Role to assign (for invite_member)'),
      search: z
        .string()
        .optional()
        .describe('Search members by name/email (for list_members)'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team ID'),
            name: z.string().optional().describe('Team name'),
            slug: z.string().optional().describe('Team URL slug'),
            avatar: z.string().optional().nullable().describe('Team avatar hash'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            membership: z
              .object({
                role: z.string().optional(),
                confirmed: z.boolean().optional()
              })
              .optional()
              .describe("Current user's membership")
          })
        )
        .optional()
        .describe('List of teams'),
      team: z
        .object({
          teamId: z.string().describe('Team ID'),
          name: z.string().optional().describe('Team name'),
          slug: z.string().optional().describe('Team URL slug')
        })
        .optional()
        .describe('Team details'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('Member user ID'),
            email: z.string().optional().describe('Member email'),
            username: z.string().optional().describe('Member username'),
            name: z.string().optional().nullable().describe('Member display name'),
            role: z.string().optional().describe('Member role')
          })
        )
        .optional()
        .describe('List of team members'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action } = ctx.input;

    if (action === 'list_teams') {
      let result = await client.listTeams({ limit: ctx.input.limit });
      let teams = (result.teams || []).map((t: any) => ({
        teamId: t.id,
        name: t.name,
        slug: t.slug,
        avatar: t.avatar || null,
        createdAt: t.createdAt?.toString(),
        membership: t.membership
          ? {
              role: t.membership.role,
              confirmed: t.membership.confirmed
            }
          : undefined
      }));
      return {
        output: { teams, success: true },
        message: `Found **${teams.length}** team(s).`
      };
    }

    if (action === 'get_team') {
      if (!ctx.input.teamId) throw vercelServiceError('teamId is required');
      let t = await client.getTeam(ctx.input.teamId);
      return {
        output: {
          team: { teamId: t.id, name: t.name, slug: t.slug },
          success: true
        },
        message: `Team **${t.name}** (${t.slug}).`
      };
    }

    if (action === 'list_members') {
      if (!ctx.input.teamId) throw vercelServiceError('teamId is required');
      let result = await client.listTeamMembers(ctx.input.teamId, {
        limit: ctx.input.limit,
        search: ctx.input.search
      });
      let members = (result.members || []).map((m: any) => ({
        userId: m.uid,
        email: m.email,
        username: m.username,
        name: m.name || null,
        role: m.role
      }));
      return {
        output: { members, success: true },
        message: `Found **${members.length}** member(s).`
      };
    }

    if (action === 'invite_member') {
      if (!ctx.input.teamId || !ctx.input.email)
        throw vercelServiceError('teamId and email are required');
      await client.inviteTeamMember(ctx.input.teamId, ctx.input.email, ctx.input.role);
      return {
        output: { success: true },
        message: `Invited **${ctx.input.email}** to team as ${ctx.input.role || 'MEMBER'}.`
      };
    }

    if (action === 'remove_member') {
      if (!ctx.input.teamId || !ctx.input.userId)
        throw vercelServiceError('teamId and userId are required');
      await client.removeTeamMember(ctx.input.teamId, ctx.input.userId);
      return {
        output: { success: true },
        message: `Removed member **${ctx.input.userId}** from team.`
      };
    }

    throw vercelServiceError(`Unknown action: ${action}`);
  })
  .build();
