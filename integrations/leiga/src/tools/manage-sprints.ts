import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSprintsTool = SlateTool.create(spec, {
  name: 'List Sprints',
  key: 'list_sprints',
  description: `List all sprints for a project. Returns sprint names, goals, dates, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to list sprints for')
    })
  )
  .output(
    z.object({
      sprints: z.array(z.any()).describe('List of sprints')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listSprints(ctx.input.projectId);

    let sprints = response.data || [];

    return {
      output: { sprints },
      message: `Found **${sprints.length}** sprint(s).`
    };
  })
  .build();

export let createSprintTool = SlateTool.create(spec, {
  name: 'Create Sprint',
  key: 'create_sprint',
  description: `Create a new sprint in a Leiga project. Set the sprint name, goal, date range, and assignee.`
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      name: z.string().describe('Sprint name'),
      goal: z.string().optional().describe('Sprint goal description'),
      startDate: z.string().optional().describe('Sprint start date (ISO 8601)'),
      endDate: z.string().optional().describe('Sprint end date (ISO 8601)'),
      assigneeId: z.number().optional().describe('User ID to assign as sprint lead')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the sprint was created'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createSprint({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      goal: ctx.input.goal,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      assigneeId: ctx.input.assigneeId
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to create sprint');
    }

    return {
      output: { success: true, raw: response.data },
      message: `Created sprint **"${ctx.input.name}"**.`
    };
  })
  .build();

export let updateSprintTool = SlateTool.create(spec, {
  name: 'Update Sprint',
  key: 'update_sprint',
  description: `Update an existing sprint's name, goal, dates, or assignee.`
})
  .input(
    z.object({
      sprintId: z.number().describe('The sprint ID to update'),
      name: z.string().optional().describe('New sprint name'),
      goal: z.string().optional().describe('New sprint goal'),
      startDate: z.string().optional().describe('New start date (ISO 8601)'),
      endDate: z.string().optional().describe('New end date (ISO 8601)'),
      assigneeId: z.number().optional().describe('New assignee user ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.updateSprint({
      sprintId: ctx.input.sprintId,
      name: ctx.input.name,
      goal: ctx.input.goal,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      assigneeId: ctx.input.assigneeId
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to update sprint');
    }

    return {
      output: { success: true },
      message: `Updated sprint **#${ctx.input.sprintId}**.`
    };
  })
  .build();

export let deleteSprintTool = SlateTool.create(spec, {
  name: 'Delete Sprint',
  key: 'delete_sprint',
  description: `Delete a sprint from a project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sprintId: z.number().describe('The sprint ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.deleteSprint(ctx.input.sprintId);

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to delete sprint');
    }

    return {
      output: { success: true },
      message: `Deleted sprint **#${ctx.input.sprintId}**.`
    };
  })
  .build();
