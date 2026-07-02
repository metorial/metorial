import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userRefSchema = z
  .object({
    emailId: z.string().optional().describe('Email address of the user'),
    userId: z.number().optional().describe('User ID')
  })
  .describe('User reference');

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Updates an existing task in Rocketlane. Supports updating the name, assignees, followers, dates, effort, progress, status, priority, at-risk flag, custom fields, and moving the task to a different phase.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      taskName: z.string().optional().describe('New task name'),
      assignees: z.array(userRefSchema).optional().describe('Updated assignees'),
      followers: z.array(userRefSchema).optional().describe('Updated followers'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      effort: z.number().optional().describe('Estimated effort in minutes'),
      progress: z.number().optional().describe('Task progress percentage (0-100)'),
      description: z.string().optional().describe('New task description'),
      status: z.string().optional().describe('New task status'),
      priority: z.string().optional().describe('New task priority'),
      atRisk: z.boolean().optional().describe('Whether the task is at risk'),
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            fieldValue: z.any().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values to update'),
      moveToPhaseId: z.number().optional().describe('Phase ID to move this task to'),
      movePosition: z.number().optional().describe('Position within the phase after moving')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the updated task'),
      taskName: z.string().optional().describe('Updated task name'),
      startDate: z.string().nullable().optional().describe('Updated start date'),
      dueDate: z.string().nullable().optional().describe('Updated due date'),
      status: z.any().optional().describe('Updated status'),
      progress: z.number().optional().describe('Updated progress')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateTask(ctx.input.taskId, {
      taskName: ctx.input.taskName,
      assignees: ctx.input.assignees,
      followers: ctx.input.followers,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      effort: ctx.input.effort,
      progress: ctx.input.progress,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      atRisk: ctx.input.atRisk,
      fields: ctx.input.fields
    });

    if (ctx.input.moveToPhaseId) {
      await client.moveTask(ctx.input.taskId, {
        phaseId: ctx.input.moveToPhaseId,
        position: ctx.input.movePosition
      });
    }

    return {
      output: result,
      message: `Task **${result.taskName || ctx.input.taskId}** updated successfully.`
    };
  })
  .build();
