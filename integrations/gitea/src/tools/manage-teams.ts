import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let teamOutputSchema = z.object({
  teamId: z.number().describe('Team ID'),
  name: z.string().describe('Team name'),
  description: z.string().describe('Team description'),
  permission: z.string().describe('Team permission level (read, write, admin, owner)'),
  units: z.array(z.string()).describe('Accessible unit types'),
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
      orgName: z.string().describe('Organization username'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      teams: z.array(teamOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
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
      orgName: z.string().describe('Organization username'),
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
      includesAllRepos: z
        .boolean()
        .optional()
        .describe('Grant access to all organization repositories')
    })
  )
  .output(teamOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let t = await client.createTeam(ctx.input.orgName, {
      name: ctx.input.name,
      description: ctx.input.description,
      permission: ctx.input.permission,
      units: ctx.input.units,
      includesAllRepositories: ctx.input.includesAllRepos
    });

    return {
      output: {
        teamId: t.id,
        name: t.name,
        description: t.description || '',
        permission: t.permission,
        units: t.units || [],
        includesAllRepos: t.includes_all_repositories
      },
      message: `Created team **${t.name}** in **${ctx.input.orgName}** with ${t.permission} permissions`
    };
  })
  .build();

export let manageTeamMember = SlateTool.create(spec, {
  name: 'Manage Team Member',
  key: 'manage_team_member',
  description: `Add or remove a user from an organization team.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamId: z.number().describe('Team ID'),
      username: z.string().describe('Username to add or remove'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the user')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });

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
