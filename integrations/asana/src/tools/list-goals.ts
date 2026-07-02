import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGoals = SlateTool.create(spec, {
  name: 'List Goals',
  key: 'list_goals',
  description: `List goals in a workspace, optionally filtered by team or portfolio. Provides visibility into organizational objectives and their statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Workspace GID'),
      teamId: z.string().optional().describe('Filter by team GID'),
      portfolioId: z.string().optional().describe('Filter by portfolio GID'),
      isWorkspaceLevel: z.boolean().optional().describe('Filter workspace-level goals only'),
      limit: z.number().optional().describe('Maximum number of goals to return')
    })
  )
  .output(
    z.object({
      goals: z.array(
        z.object({
          goalId: z.string(),
          name: z.string(),
          owner: z.any().optional(),
          dueOn: z.string().nullable().optional(),
          startOn: z.string().nullable().optional(),
          status: z.string().nullable().optional(),
          notes: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGoals({
      workspaceId: ctx.input.workspaceId,
      teamId: ctx.input.teamId,
      portfolioId: ctx.input.portfolioId,
      isWorkspaceLevel: ctx.input.isWorkspaceLevel,
      limit: ctx.input.limit
    });

    let goals = (result.data || []).map((g: any) => ({
      goalId: g.gid,
      name: g.name,
      owner: g.owner,
      dueOn: g.due_on,
      startOn: g.start_on,
      status: g.status,
      notes: g.notes
    }));

    return {
      output: { goals },
      message: `Found **${goals.length}** goal(s).`
    };
  })
  .build();

export let getGoal = SlateTool.create(spec, {
  name: 'Get Goal',
  key: 'get_goal',
  description: `Get full details for a goal including its metric, notes, and followers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      goalId: z.string().describe('Goal GID')
    })
  )
  .output(
    z.object({
      goalId: z.string(),
      name: z.string(),
      owner: z.any().optional(),
      dueOn: z.string().nullable().optional(),
      startOn: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      notes: z.string().optional(),
      htmlNotes: z.string().optional(),
      metric: z.any().optional(),
      followers: z.array(z.any()).optional(),
      workspace: z.any().optional(),
      team: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let g = await client.getGoal(ctx.input.goalId);

    return {
      output: {
        goalId: g.gid,
        name: g.name,
        owner: g.owner,
        dueOn: g.due_on,
        startOn: g.start_on,
        status: g.status,
        notes: g.notes,
        htmlNotes: g.html_notes,
        metric: g.metric,
        followers: g.followers,
        workspace: g.workspace,
        team: g.team
      },
      message: `Retrieved goal **${g.name}** (${g.gid}).`
    };
  })
  .build();
