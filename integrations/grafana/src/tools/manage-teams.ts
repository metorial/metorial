import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let searchTeams = SlateTool.create(spec, {
  name: 'Search Teams',
  key: 'search_teams',
  description: `Search and list teams in the current organization. Returns team names, member counts, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter teams by name'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.number().describe('Numeric ID of the team'),
          name: z.string().describe('Team name'),
          email: z.string().optional().describe('Team email'),
          memberCount: z.number().optional().describe('Number of team members')
        })
      ),
      totalCount: z.number().describe('Total number of matching teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.searchTeams({
      query: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let teams = (result.teams || []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      email: t.email,
      memberCount: t.memberCount
    }));

    return {
      output: {
        teams,
        totalCount: result.totalCount || teams.length
      },
      message: `Found **${result.totalCount || teams.length}** team(s).`
    };
  })
  .build();

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new team in the current organization. Team names must be unique within the organization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new team (must be unique)'),
      email: z.string().optional().describe('Optional email for the team')
    })
  )
  .output(
    z.object({
      teamId: z.number().describe('ID of the created team'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createTeam(ctx.input.name, ctx.input.email);

    return {
      output: {
        teamId: result.teamId,
        message: result.message || `Team ${ctx.input.name} created.`
      },
      message: `Team **${ctx.input.name}** created (ID: ${result.teamId}).`
    };
  })
  .build();

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieve a Grafana team by ID, including its name, email, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team to retrieve')
    })
  )
  .output(
    z.object({
      teamId: z.number().describe('Team ID'),
      name: z.string().describe('Team name'),
      email: z.string().optional().describe('Team email'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let team = await client.getTeam(ctx.input.teamId);

    return {
      output: {
        teamId: team.id,
        name: team.name,
        email: team.email,
        created: team.created,
        updated: team.updated
      },
      message: `Retrieved team **${team.name || ctx.input.teamId}**.`
    };
  })
  .build();

export let updateTeam = SlateTool.create(spec, {
  name: 'Update Team',
  key: 'update_team',
  description: `Update a Grafana team's name and optional email address by ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team to update'),
      name: z.string().describe('Updated team name'),
      email: z.string().optional().describe('Updated team email')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.updateTeam(ctx.input.teamId, ctx.input.name, ctx.input.email);

    return {
      output: {
        message: result.message || `Team ${ctx.input.teamId} updated.`
      },
      message: `Team **${ctx.input.teamId}** updated.`
    };
  })
  .build();

export let getTeamMembers = SlateTool.create(spec, {
  name: 'Get Team Members',
  key: 'get_team_members',
  description: `List all members of a team by team ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team to list members for')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          login: z.string().optional().describe('User login name'),
          email: z.string().optional().describe('User email'),
          name: z.string().optional().describe('User display name'),
          permission: z.number().optional().describe('Permission level in the team')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.getTeamMembers(ctx.input.teamId);

    let members = results.map((m: any) => ({
      userId: m.userId,
      login: m.login,
      email: m.email,
      name: m.name,
      permission: m.permission
    }));

    return {
      output: { members },
      message: `Team has **${members.length}** member(s).`
    };
  })
  .build();

export let addTeamMember = SlateTool.create(spec, {
  name: 'Add Team Member',
  key: 'add_team_member',
  description: `Add a user to a team by their user ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team to add the member to'),
      userId: z.number().describe('ID of the user to add')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.addTeamMember(ctx.input.teamId, ctx.input.userId);

    return {
      output: {
        message: `User ${ctx.input.userId} added to team ${ctx.input.teamId}.`
      },
      message: `User **${ctx.input.userId}** added to team **${ctx.input.teamId}**.`
    };
  })
  .build();

export let removeTeamMember = SlateTool.create(spec, {
  name: 'Remove Team Member',
  key: 'remove_team_member',
  description: `Remove a user from a team.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team'),
      userId: z.number().describe('ID of the user to remove')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.removeTeamMember(ctx.input.teamId, ctx.input.userId);

    return {
      output: {
        message: `User ${ctx.input.userId} removed from team ${ctx.input.teamId}.`
      },
      message: `User **${ctx.input.userId}** removed from team **${ctx.input.teamId}**.`
    };
  })
  .build();

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Delete a team by its ID. All team members will be removed from the team.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteTeam(ctx.input.teamId);

    return {
      output: {
        message: `Team ${ctx.input.teamId} deleted.`
      },
      message: `Team **${ctx.input.teamId}** has been deleted.`
    };
  })
  .build();
