import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a single task by its ID. Returns full task details including scheduling information, assignees, labels, custom field values, and project association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to retrieve')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique identifier of the task'),
      name: z.string().describe('Title of the task'),
      description: z.string().optional().describe('HTML description'),
      dueDate: z.string().optional().describe('ISO 8601 due date'),
      deadlineType: z.string().optional().describe('HARD, SOFT, or NONE'),
      duration: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Duration in minutes or special value'),
      priority: z.string().optional().describe('Priority level'),
      status: z.any().optional().describe('Current status'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      completedTime: z.string().optional().describe('When the task was completed'),
      startOn: z.string().optional().describe('Date when the task should begin (YYYY-MM-DD)'),
      labels: z.array(z.any()).optional().describe('Labels attached to the task'),
      assignees: z.array(z.any()).optional().describe('Users assigned to the task'),
      creator: z.any().optional().describe('User who created the task'),
      project: z.any().optional().describe('Associated project details'),
      workspace: z.any().optional().describe('Workspace details'),
      scheduledStart: z.string().optional().describe('Auto-scheduled start time'),
      scheduledEnd: z.string().optional().describe('Auto-scheduled end time'),
      schedulingIssue: z
        .boolean()
        .optional()
        .describe('Whether Motion was unable to schedule this task'),
      chunks: z
        .array(z.any())
        .optional()
        .describe('Scheduling chunks with IDs, durations, and times'),
      customFieldValues: z
        .any()
        .optional()
        .describe('Custom field values keyed by field name'),
      createdTime: z.string().optional().describe('When the task was created'),
      updatedTime: z.string().optional().describe('When the task was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let task = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate,
        deadlineType: task.deadlineType,
        duration: task.duration,
        priority: task.priority,
        status: task.status,
        completed: task.completed,
        completedTime: task.completedTime,
        startOn: task.startOn,
        labels: task.labels,
        assignees: task.assignees,
        creator: task.creator,
        project: task.project,
        workspace: task.workspace,
        scheduledStart: task.scheduledStart,
        scheduledEnd: task.scheduledEnd,
        schedulingIssue: task.schedulingIssue,
        chunks: task.chunks,
        customFieldValues: task.customFieldValues,
        createdTime: task.createdTime,
        updatedTime: task.updatedTime
      },
      message: `Retrieved task **${task.name}** (${task.priority || 'no priority'}, ${task.status?.name || 'no status'})`
    };
  })
  .build();
