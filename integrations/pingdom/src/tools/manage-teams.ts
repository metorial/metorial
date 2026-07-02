import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamOutputSchema = z.object({
  teamId: z.number().describe('Team ID'),
  name: z.string().optional().describe('Team name'),
  members: z
    .array(
      z.object({
        memberId: z.number().describe('Member ID'),
        name: z.string().optional().describe('Member name'),
        type: z.string().optional().describe('Member type')
      })
    )
    .optional()
    .describe('Team members')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Lists all alerting teams in your Pingdom account. Teams group contacts for notification purposes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(teamOutputSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listTeams();
    let teams = (result.teams || []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      members: t.members?.map((m: any) => ({
        memberId: m.id,
        name: m.name,
        type: m.type
      }))
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Creates a new alerting team. Teams group users and contacts together for notification purposes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the team'),
      memberIds: z
        .array(z.number())
        .optional()
        .describe('Contact/user IDs to add as team members')
    })
  )
  .output(
    z.object({
      teamId: z.number().describe('ID of the created team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {
      name: ctx.input.name
    };
    if (ctx.input.memberIds?.length) {
      data.member_ids = ctx.input.memberIds;
    }

    let result = await client.createTeam(data);
    let team = result.team || result;

    return {
      output: { teamId: team.id },
      message: `Created team **${ctx.input.name}** (ID: ${team.id}).`
    };
  })
  .build();

export let updateTeam = SlateTool.create(spec, {
  name: 'Update Team',
  key: 'update_team',
  description: `Updates an existing team's name or members.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamId: z.number().describe('ID of the team to update'),
      name: z.string().optional().describe('New team name'),
      memberIds: z.array(z.number()).optional().describe('Updated list of member IDs')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.memberIds !== undefined) data.member_ids = ctx.input.memberIds;

    let result = await client.updateTeam(ctx.input.teamId, data);

    return {
      output: { message: result.message || 'Team updated successfully' },
      message: `Updated team **${ctx.input.teamId}**.`
    };
  })
  .build();

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Permanently deletes a team. This action cannot be undone.`,
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
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.deleteTeam(ctx.input.teamId);

    return {
      output: { message: result.message || 'Team deleted successfully' },
      message: `Deleted team **${ctx.input.teamId}**.`
    };
  })
  .build();
