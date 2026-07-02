import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let manageTeamsTool = SlateTool.create(spec, {
  name: 'Manage Teams',
  key: 'manage_teams',
  description: `List, create, and manage teams within a Hootsuite organization.
Use **list** to see all teams in an organization. Use **get** to fetch a team's details.
Use **create** to create a new team. Use **add_member** or **remove_member** to manage team membership.
Use **list_members** to see members in a team. Use **list_social_profiles** to see social profiles assigned to a team.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'list_members',
          'add_member',
          'remove_member',
          'list_social_profiles'
        ])
        .describe('Action to perform'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for list, create)'),
      teamId: z
        .string()
        .optional()
        .describe(
          'Team ID (required for get, list_members, add_member, remove_member, list_social_profiles)'
        ),
      teamName: z.string().optional().describe('Name for the new team (required for create)'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID (required for add_member, remove_member)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team ID'),
            teamName: z.string().optional().describe('Team name'),
            organizationId: z.string().optional().describe('Organization ID')
          })
        )
        .optional()
        .describe('List of teams'),
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            fullName: z.string().optional().describe('Member full name'),
            email: z.string().optional().describe('Member email')
          })
        )
        .optional()
        .describe('List of team members'),
      socialProfiles: z
        .array(
          z.object({
            socialProfileId: z.string().describe('Social profile ID'),
            type: z.string().optional().describe('Social network type')
          })
        )
        .optional()
        .describe('Social profiles accessible to the team'),
      cursor: z.string().optional().describe('Pagination cursor'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for list action');
      let result = await client.getOrganizationTeams(
        ctx.input.organizationId,
        ctx.input.cursor
      );
      let teams = result.teams.map((t: any) => ({
        teamId: String(t.id),
        teamName: t.name,
        organizationId: t.organizationId ? String(t.organizationId) : ctx.input.organizationId
      }));

      return {
        output: {
          teams,
          members: undefined,
          socialProfiles: undefined,
          cursor: result.cursor,
          success: undefined
        },
        message: `Found **${teams.length}** team(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.teamId) throw new Error('teamId is required for get action');
      let team = await client.getTeam(ctx.input.teamId);

      return {
        output: {
          teams: [
            {
              teamId: String(team.id),
              teamName: team.name,
              organizationId: team.organizationId ? String(team.organizationId) : undefined
            }
          ],
          members: undefined,
          socialProfiles: undefined,
          cursor: undefined,
          success: undefined
        },
        message: `Retrieved team **${team.name || team.id}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.organizationId || !ctx.input.teamName) {
        throw new Error('organizationId and teamName are required for create action');
      }
      let team = await client.createTeam(ctx.input.organizationId, ctx.input.teamName);

      return {
        output: {
          teams: [
            {
              teamId: String(team.id),
              teamName: team.name || ctx.input.teamName,
              organizationId: ctx.input.organizationId
            }
          ],
          members: undefined,
          socialProfiles: undefined,
          cursor: undefined,
          success: true
        },
        message: `Created team **${ctx.input.teamName}** in organization **${ctx.input.organizationId}**.`
      };
    }

    if (action === 'list_members') {
      if (!ctx.input.teamId) throw new Error('teamId is required for list_members action');
      let result = await client.getTeamMembers(ctx.input.teamId, ctx.input.cursor);
      let members = result.members.map((m: any) => ({
        memberId: String(m.id),
        fullName: m.fullName,
        email: m.email
      }));

      return {
        output: {
          teams: undefined,
          members,
          socialProfiles: undefined,
          cursor: result.cursor,
          success: undefined
        },
        message: `Found **${members.length}** member(s) in team **${ctx.input.teamId}**.`
      };
    }

    if (action === 'add_member') {
      if (!ctx.input.teamId || !ctx.input.memberId) {
        throw new Error('teamId and memberId are required for add_member action');
      }
      await client.addTeamMember(ctx.input.teamId, ctx.input.memberId);

      return {
        output: {
          teams: undefined,
          members: undefined,
          socialProfiles: undefined,
          cursor: undefined,
          success: true
        },
        message: `Added member **${ctx.input.memberId}** to team **${ctx.input.teamId}**.`
      };
    }

    if (action === 'remove_member') {
      if (!ctx.input.teamId || !ctx.input.memberId) {
        throw new Error('teamId and memberId are required for remove_member action');
      }
      await client.removeTeamMember(ctx.input.teamId, ctx.input.memberId);

      return {
        output: {
          teams: undefined,
          members: undefined,
          socialProfiles: undefined,
          cursor: undefined,
          success: true
        },
        message: `Removed member **${ctx.input.memberId}** from team **${ctx.input.teamId}**.`
      };
    }

    // list_social_profiles
    if (!ctx.input.teamId)
      throw new Error('teamId is required for list_social_profiles action');
    let profiles = await client.getTeamSocialProfiles(ctx.input.teamId, ctx.input.cursor);
    let socialProfiles = profiles.map((p: any) => ({
      socialProfileId: String(p.id),
      type: p.type
    }));

    return {
      output: {
        teams: undefined,
        members: undefined,
        socialProfiles,
        cursor: undefined,
        success: undefined
      },
      message: `Found **${socialProfiles.length}** social profile(s) accessible to team **${ctx.input.teamId}**.`
    };
  })
  .build();
