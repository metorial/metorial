import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { integerInput } from '../lib/validation';
import { spec } from '../spec';

let teamOutputSchema = z.object({
  teamId: z.number().describe('Team ID; use list_teams to discover it'),
  name: z.string().describe('Team name'),
  description: z.string().describe('Team description'),
  permission: z.string().describe('Team permission level (read, write, admin, owner)'),
  units: z.array(z.string()).describe('Accessible unit types'),
  unitsMap: z
    .record(z.string(), z.string())
    .optional()
    .describe('Per-unit permissions when provided by the instance'),
  includesAllRepos: z.boolean().describe('Whether the team has access to all repos')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in an organization with their permissions and accessible units.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgName: z.string().min(1).describe('Organization username'),
      page: integerInput(1).optional().describe('Page number'),
      limit: integerInput(0).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      teams: z.array(teamOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
    let teams = await client.listOrgTeams(ctx.input.orgName, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        teams: teams.map(t => ({
          teamId: t.id,
          name: t.name,
          description: t.description || '',
          permission: t.permission,
          units: t.units || [],
          unitsMap: t.units_map,
          includesAllRepos: t.includes_all_repositories
        }))
      },
      message: `Found **${teams.length}** teams in **${ctx.input.orgName}**`
    };
  })
  .build();

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new team within an organization with specified permissions and unit access.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgName: z.string().min(1).describe('Organization username'),
      name: z.string().describe('Team name'),
      description: z.string().optional().describe('Team description'),
      permission: z
        .enum(['read', 'write', 'admin', 'owner'])
        .optional()
        .describe('Permission level (default: read)'),
      units: z
        .array(z.string())
        .optional()
        .describe('Accessible units (e.g., "repo.code", "repo.issues", "repo.pulls")'),
      unitsMap: z
        .record(z.string(), z.enum(['none', 'read', 'write', 'admin', 'owner']))
        .optional()
        .describe(
          'Per-unit permissions on current Gitea versions; takes precedence over legacy units'
        ),
      includesAllRepos: z
        .boolean()
        .optional()
        .describe('Grant access to all organization repositories')
    })
  )
  .output(teamOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
    if (ctx.input.permission === 'owner')
      throw createApiServiceError(
        'The owner permission belongs to the automatically managed Owners team. Use read, write, or admin for a new team.'
      );
    let t = await client.createTeam(ctx.input.orgName, {
      name: ctx.input.name,
      description: ctx.input.description,
      permission: ctx.input.permission,
      units: ctx.input.unitsMap ? undefined : ctx.input.units,
      unitsMap: ctx.input.unitsMap,
      includesAllRepositories: ctx.input.includesAllRepos
    });

    return {
      output: {
        teamId: t.id,
        name: t.name,
        description: t.description || '',
        permission: t.permission,
        units: t.units || [],
        unitsMap: t.units_map,
        includesAllRepos: t.includes_all_repositories
      },
      message: `Created team **${t.name}** in **${ctx.input.orgName}** with ${t.permission} permissions`
    };
  })
  .build();

export let manageTeamMember = SlateTool.create(spec, {
  name: 'Manage Team Member',
  key: 'manage_team_member',
  description: `List a team's members, or add or remove a user from an organization team.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: integerInput(1).describe('Team ID; use list_teams to discover it'),
      username: z
        .string()
        .min(1)
        .optional()
        .describe('Username required when action is add or remove'),
      action: z
        .enum(['add', 'remove', 'list'])
        .describe('Membership action; list discovers and verifies current members'),
      page: integerInput(1).optional(),
      limit: integerInput(0).optional()
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('Action performed'),
      members: z
        .array(z.object({ userId: z.number(), username: z.string(), fullName: z.string() }))
        .optional()
        .describe('Current members when action is list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);

    if (ctx.input.action === 'list') {
      const members = await client.listTeamMembers(ctx.input.teamId, {
        page: ctx.input.page,
        limit: ctx.input.limit
      });
      return {
        output: {
          success: true,
          action: 'list',
          members: members.map(member => ({
            userId: member.id,
            username: member.login,
            fullName: member.full_name || member.login
          }))
        },
        message: `Found **${members.length}** members in team **#${ctx.input.teamId}**.`
      };
    }
    if (!ctx.input.username)
      throw createApiServiceError('Provide username when adding or removing a team member.');

    if (ctx.input.action === 'add') {
      await client.addTeamMember(ctx.input.teamId, ctx.input.username);
    } else {
      await client.removeTeamMember(ctx.input.teamId, ctx.input.username);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${ctx.input.username}** ${ctx.input.action === 'add' ? 'to' : 'from'} team **#${ctx.input.teamId}**`
    };
  })
  .build();
