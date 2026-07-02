import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { spec } from '../spec';

let teamSummarySchema = z.object({
  teamId: z.string().describe('Team ID'),
  name: z.string().describe('Team name'),
  key: z.string().describe('Team key used in issue identifiers'),
  description: z.string().nullable().describe('Team description'),
  color: z.string().nullable().describe('Team color'),
  icon: z.string().nullable().describe('Team icon'),
  private: z.boolean().describe('Whether the team is private'),
  timezone: z.string().nullable().describe('Team timezone'),
  cyclesEnabled: z.boolean().describe('Whether cycles are enabled'),
  triageEnabled: z.boolean().describe('Whether triage is enabled'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listTeamsTool = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Lists all teams in the workspace. Use this to discover team IDs needed for creating issues, cycles, and filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of teams to return (default: 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSummarySchema),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let result = await client.listTeams({
      first: ctx.input.first,
      after: ctx.input.after
    });

    let teams = (result.nodes || []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      key: t.key,
      description: t.description || null,
      color: t.color || null,
      icon: t.icon || null,
      private: t.private ?? false,
      timezone: t.timezone || null,
      cyclesEnabled: t.cyclesEnabled ?? false,
      triageEnabled: t.triageEnabled ?? false,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: {
        teams,
        hasNextPage: result.pageInfo?.hasNextPage || false,
        nextCursor: result.pageInfo?.endCursor || null
      },
      message: `Found **${teams.length}** teams: ${teams.map((t: any) => `${t.name} (${t.key})`).join(', ')}`
    };
  })
  .build();

export let getTeamTool = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieves detailed information about a team including its workflow states, labels, and members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID')
    })
  )
  .output(
    z.object({
      teamId: z.string(),
      name: z.string(),
      key: z.string(),
      description: z.string().nullable(),
      color: z.string().nullable(),
      icon: z.string().nullable(),
      private: z.boolean(),
      timezone: z.string().nullable(),
      cyclesEnabled: z.boolean(),
      triageEnabled: z.boolean(),
      workflowStates: z.array(
        z.object({
          stateId: z.string(),
          name: z.string(),
          type: z.string(),
          color: z.string(),
          position: z.number()
        })
      ),
      labels: z.array(
        z.object({
          labelId: z.string(),
          name: z.string(),
          color: z.string()
        })
      ),
      members: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          email: z.string(),
          displayName: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          active: z.boolean()
        })
      ),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinearClient(ctx.auth.token);
    let team = await client.getTeam(ctx.input.teamId);

    return {
      output: {
        teamId: team.id,
        name: team.name,
        key: team.key,
        description: team.description || null,
        color: team.color || null,
        icon: team.icon || null,
        private: team.private ?? false,
        timezone: team.timezone || null,
        cyclesEnabled: team.cyclesEnabled ?? false,
        triageEnabled: team.triageEnabled ?? false,
        workflowStates: (team.states?.nodes || []).map((s: any) => ({
          stateId: s.id,
          name: s.name,
          type: s.type,
          color: s.color,
          position: s.position
        })),
        labels: (team.labels?.nodes || []).map((l: any) => ({
          labelId: l.id,
          name: l.name,
          color: l.color
        })),
        members: (team.members?.nodes || []).map((m: any) => ({
          userId: m.id,
          name: m.name,
          email: m.email,
          displayName: m.displayName || null,
          avatarUrl: m.avatarUrl || null,
          active: m.active ?? true
        })),
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      },
      message: `Retrieved team **${team.name}** (${team.key}) with ${team.members?.nodes?.length || 0} members, ${team.states?.nodes?.length || 0} workflow states, and ${team.labels?.nodes?.length || 0} labels`
    };
  })
  .build();
