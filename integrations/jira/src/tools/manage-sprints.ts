import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listSprintsTool = SlateTool.create(spec, {
  name: 'List Sprints',
  key: 'list_sprints',
  description: `List sprints for a given board. Optionally filter by sprint state (active, future, or closed).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.coerce.number().describe('The board ID to list sprints for.'),
      state: z
        .enum(['active', 'future', 'closed'])
        .optional()
        .describe('Filter sprints by state.'),
      startAt: z.number().optional().default(0).describe('Pagination start index.'),
      maxResults: z.number().optional().default(50).describe('Maximum sprints to return.')
    })
  )
  .output(
    z.object({
      sprints: z.array(
        z.object({
          sprintId: z.number().describe('The sprint ID.'),
          name: z.string().describe('Sprint name.'),
          state: z.string().describe('Sprint state (active, future, closed).'),
          startDate: z.string().optional().describe('Sprint start date.'),
          endDate: z.string().optional().describe('Sprint end date.'),
          completeDate: z.string().optional().describe('Sprint completion date.'),
          goal: z.string().optional().describe('Sprint goal.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let result = await client.getSprints(ctx.input.boardId, {
      state: ctx.input.state,
      startAt: ctx.input.startAt,
      maxResults: ctx.input.maxResults
    });

    let sprints = (result.values ?? []).map((s: any) => ({
      sprintId: s.id,
      name: s.name,
      state: s.state,
      startDate: s.startDate,
      endDate: s.endDate,
      completeDate: s.completeDate,
      goal: s.goal
    }));

    return {
      output: { sprints },
      message: `Found ${sprints.length} sprints for board ${ctx.input.boardId}.`
    };
  })
  .build();

export let createSprintTool = SlateTool.create(spec, {
  name: 'Create Sprint',
  key: 'create_sprint',
  description: `Create a new sprint on a Scrum board. Optionally set start/end dates and a sprint goal.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.coerce.number().describe('The board ID to create the sprint on.'),
      name: z.string().describe('The sprint name.'),
      startDate: z.string().optional().describe('Sprint start date in ISO 8601 format.'),
      endDate: z.string().optional().describe('Sprint end date in ISO 8601 format.'),
      goal: z.string().optional().describe('The sprint goal.')
    })
  )
  .output(
    z.object({
      sprintId: z.number().describe('The ID of the created sprint.'),
      name: z.string().describe('The sprint name.'),
      state: z.string().describe('The sprint state.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let sprint = await client.createSprint({
      name: ctx.input.name,
      originBoardId: ctx.input.boardId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      goal: ctx.input.goal
    });

    return {
      output: {
        sprintId: sprint.id,
        name: sprint.name,
        state: sprint.state
      },
      message: `Created sprint **${sprint.name}** (ID: ${sprint.id}) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let moveIssuesToSprintTool = SlateTool.create(spec, {
  name: 'Move Issues to Sprint',
  key: 'move_issues_to_sprint',
  description: `Move one or more issues to a specific sprint. Issues will be removed from their current sprint and added to the target sprint.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      sprintId: z.coerce.number().describe('The target sprint ID.'),
      issueKeys: z
        .array(z.string())
        .describe('Issue keys to move (e.g., ["PROJ-1", "PROJ-2"]).')
    })
  )
  .output(
    z.object({
      sprintId: z.number().describe('The sprint ID issues were moved to.'),
      movedCount: z.number().describe('Number of issues moved.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.moveIssuesToSprint(ctx.input.sprintId, ctx.input.issueKeys);

    return {
      output: {
        sprintId: ctx.input.sprintId,
        movedCount: ctx.input.issueKeys.length
      },
      message: `Moved **${ctx.input.issueKeys.length}** issue(s) to sprint ${ctx.input.sprintId}.`
    };
  })
  .build();
