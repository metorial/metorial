import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dockerHubServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List teams (groups) within a Docker Hub organization. Returns team names, descriptions, and member counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      page: z.number().optional().describe('Page number for pagination.'),
      pageSize: z.number().optional().describe('Number of results per page.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of teams.'),
      teams: z.array(
        z.object({
          teamId: z.number().describe('Unique team ID.'),
          teamName: z.string().describe('Name of the team.'),
          description: z.string().describe('Team description.'),
          memberCount: z.number().describe('Number of members in the team.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listTeams(ctx.input.orgName, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        teams: result.results.map(t => ({
          teamId: t.id,
          teamName: t.name,
          description: t.description || '',
          memberCount: t.member_count
        }))
      },
      message: `Found **${result.count}** teams in organization **${ctx.input.orgName}**.`
    };
  })
  .build();

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new team within a Docker Hub organization. Teams can be assigned repository-level permissions (read, write, admin).`
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      teamName: z.string().describe('Name for the new team.'),
      description: z.string().optional().describe('Description of the team.')
    })
  )
  .output(
    z.object({
      teamId: z.number().describe('Unique team ID.'),
      teamName: z.string().describe('Name of the created team.'),
      description: z.string().describe('Team description.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let team = await client.createTeam(ctx.input.orgName, {
      name: ctx.input.teamName,
      description: ctx.input.description
    });

    return {
      output: {
        teamId: team.id,
        teamName: team.name,
        description: team.description || ''
      },
      message: `Created team **${team.name}** in organization **${ctx.input.orgName}**.`
    };
  })
  .build();

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Delete a team from a Docker Hub organization. All team-level repository permissions will be revoked.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      teamName: z.string().describe('Name of the team to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the team was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteTeam(ctx.input.orgName, ctx.input.teamName);

    return {
      output: { deleted: true },
      message: `Deleted team **${ctx.input.teamName}** from organization **${ctx.input.orgName}**.`
    };
  })
  .build();

export let manageTeamMembers = SlateTool.create(spec, {
  name: 'Manage Team Members',
  key: 'manage_team_members',
  description: `List, add, or remove members from a Docker Hub organization team. Use the **action** field to specify the operation.`,
  instructions: [
    'Set action to "list" to list current team members.',
    'Set action to "add" to add a user to the team (requires username).',
    'Set action to "remove" to remove a user from the team (requires username).'
  ]
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      teamName: z.string().describe('Name of the team.'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform on team members.'),
      username: z
        .string()
        .optional()
        .describe('Docker Hub username. Required for "add" and "remove" actions.')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            username: z.string().describe('Docker Hub username.'),
            fullName: z.string().describe('Full name of the member.')
          })
        )
        .optional()
        .describe('Team members (returned for "list" action).'),
      success: z.boolean().describe('Whether the action succeeded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'list') {
      let result = await client.listTeamMembers(ctx.input.orgName, ctx.input.teamName);
      return {
        output: {
          members: result.results.map(m => ({
            username: m.username,
            fullName: m.full_name || ''
          })),
          success: true
        },
        message: `Found **${result.count}** members in team **${ctx.input.teamName}**.`
      };
    }

    if (!ctx.input.username) {
      throw dockerHubServiceError(`Username is required for "${ctx.input.action}" action.`);
    }

    if (ctx.input.action === 'add') {
      await client.addTeamMember(ctx.input.orgName, ctx.input.teamName, ctx.input.username);
      return {
        output: { success: true },
        message: `Added **${ctx.input.username}** to team **${ctx.input.teamName}**.`
      };
    }

    await client.removeTeamMember(ctx.input.orgName, ctx.input.teamName, ctx.input.username);
    return {
      output: { success: true },
      message: `Removed **${ctx.input.username}** from team **${ctx.input.teamName}**.`
    };
  })
  .build();
