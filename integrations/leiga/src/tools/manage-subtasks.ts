import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addSubtaskTool = SlateTool.create(spec, {
  name: 'Add Subtask',
  key: 'add_subtask',
  description: `Add a subtask to an existing issue. Subtasks can have their own assignee, due date, and estimate.`
})
  .input(
    z.object({
      issueId: z.number().describe('The parent issue ID'),
      summary: z.string().describe('Subtask summary/title'),
      assigneeId: z.number().optional().describe('User ID to assign the subtask to'),
      dueDate: z.string().optional().describe('Due date for the subtask (ISO 8601)'),
      estimatePoint: z.number().optional().describe('Estimated story points')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the subtask was created'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.addSubtask({
      issueId: ctx.input.issueId,
      summary: ctx.input.summary,
      assigneeId: ctx.input.assigneeId,
      dueDate: ctx.input.dueDate,
      estimatePoint: ctx.input.estimatePoint
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to add subtask');
    }

    return {
      output: { success: true, raw: response.data },
      message: `Added subtask **"${ctx.input.summary}"** to issue #${ctx.input.issueId}.`
    };
  })
  .build();

export let updateSubtaskTool = SlateTool.create(spec, {
  name: 'Update Subtask',
  key: 'update_subtask',
  description: `Update a subtask's fields including summary, status, assignee, due date, or estimate.`
})
  .input(
    z.object({
      subtaskId: z.number().describe('The subtask ID to update'),
      summary: z.string().optional().describe('New subtask summary'),
      status: z.string().optional().describe('New subtask status'),
      assigneeId: z.number().optional().describe('New assignee user ID'),
      dueDate: z.string().optional().describe('New due date (ISO 8601)'),
      estimatePoint: z.number().optional().describe('New estimate in story points')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.updateSubtask({
      subtaskId: ctx.input.subtaskId,
      summary: ctx.input.summary,
      status: ctx.input.status,
      assigneeId: ctx.input.assigneeId,
      dueDate: ctx.input.dueDate,
      estimatePoint: ctx.input.estimatePoint
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to update subtask');
    }

    return {
      output: { success: true },
      message: `Updated subtask **#${ctx.input.subtaskId}**.`
    };
  })
  .build();

export let deleteSubtaskTool = SlateTool.create(spec, {
  name: 'Delete Subtask',
  key: 'delete_subtask',
  description: `Delete a subtask from an issue.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subtaskId: z.number().describe('The subtask ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.deleteSubtask(ctx.input.subtaskId);

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to delete subtask');
    }

    return {
      output: { success: true },
      message: `Deleted subtask **#${ctx.input.subtaskId}**.`
    };
  })
  .build();
