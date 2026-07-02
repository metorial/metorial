import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

let autoScheduledSchema = z
  .object({
    startDate: z
      .string()
      .optional()
      .describe('ISO 8601 date for when the task should start being scheduled'),
    deadlineType: z
      .enum(['HARD', 'SOFT', 'NONE'])
      .optional()
      .describe(
        'Type of deadline. HARD = must be done by due date, SOFT = preferred by due date, NONE = no deadline pressure'
      ),
    schedule: z
      .string()
      .optional()
      .describe(
        'Schedule to use for auto-scheduling. Defaults to "Work Hours". Must be "Work Hours" when assigning to other users.'
      )
  })
  .optional()
  .describe('Auto-scheduling configuration. Set to null to disable auto-scheduling.');

let taskOutputSchema = z.object({
  taskId: z.string().describe('Unique identifier of the task'),
  name: z.string().describe('Title of the task'),
  description: z.string().optional().describe('HTML description of the task'),
  dueDate: z.string().optional().describe('ISO 8601 due date'),
  duration: z
    .union([z.string(), z.number()])
    .optional()
    .describe('Duration in minutes, "NONE", or "REMINDER"'),
  priority: z.string().optional().describe('Priority level: ASAP, HIGH, MEDIUM, or LOW'),
  status: z.any().optional().describe('Current status of the task'),
  completed: z.boolean().optional().describe('Whether the task is completed'),
  labels: z.array(z.any()).optional().describe('Labels attached to the task'),
  assignees: z.array(z.any()).optional().describe('Users assigned to the task'),
  projectId: z.string().optional().describe('Associated project ID'),
  workspaceId: z.string().optional().describe('Workspace the task belongs to'),
  scheduledStart: z.string().optional().describe('Auto-scheduled start time'),
  scheduledEnd: z.string().optional().describe('Auto-scheduled end time'),
  schedulingIssue: z
    .boolean()
    .optional()
    .describe('Whether Motion was unable to schedule this task'),
  createdTime: z.string().optional().describe('When the task was created'),
  updatedTime: z.string().optional().describe('When the task was last updated')
});

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a Motion workspace. Supports setting priority, due dates, deadlines, auto-scheduling, project association, labels, and assignee. Motion will automatically schedule the task based on the provided parameters.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Title of the task'),
      workspaceId: z.string().describe('ID of the workspace to create the task in'),
      dueDate: z
        .string()
        .optional()
        .describe('ISO 8601 due date. Required for scheduled tasks.'),
      duration: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Duration in minutes (integer > 0), "NONE", or "REMINDER"'),
      status: z
        .string()
        .optional()
        .describe('Task status. Defaults to workspace default status.'),
      projectId: z
        .string()
        .optional()
        .describe('ID of the project to associate the task with'),
      description: z
        .string()
        .optional()
        .describe('Task description in GitHub Flavored Markdown'),
      priority: z
        .enum(['ASAP', 'HIGH', 'MEDIUM', 'LOW'])
        .optional()
        .describe('Priority level for the task'),
      labels: z.array(z.string()).optional().describe('Label names to attach to the task'),
      assigneeId: z.string().optional().describe('User ID to assign the task to'),
      autoScheduled: z
        .union([autoScheduledSchema, z.null()])
        .optional()
        .describe('Auto-scheduling configuration. Set to null to disable.')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let task = await client.createTask({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      dueDate: ctx.input.dueDate,
      duration: ctx.input.duration,
      status: ctx.input.status,
      projectId: ctx.input.projectId,
      description: ctx.input.description,
      priority: ctx.input.priority,
      labels: ctx.input.labels,
      assigneeId: ctx.input.assigneeId,
      autoScheduled: ctx.input.autoScheduled
    });

    return {
      output: {
        taskId: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate,
        duration: task.duration,
        priority: task.priority,
        status: task.status,
        completed: task.completed,
        labels: task.labels,
        assignees: task.assignees,
        projectId: task.project?.id,
        workspaceId: task.workspace?.id,
        scheduledStart: task.scheduledStart,
        scheduledEnd: task.scheduledEnd,
        schedulingIssue: task.schedulingIssue,
        createdTime: task.createdTime,
        updatedTime: task.updatedTime
      },
      message: `Created task **${task.name}**${task.project ? ` in project ${task.project.name}` : ''}${task.schedulingIssue ? ' (scheduling issue detected)' : ''}`
    };
  })
  .build();
