import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task's properties. Can modify the name, description, due date, duration, priority, status, labels, assignee, project, and auto-scheduling settings. Also supports moving a task to a different workspace (which resets project, status, labels, and assignee) and unassigning a task.`,
  instructions: [
    "To move a task to a different workspace, provide `moveToWorkspaceId`. This will reset the task's project, status, labels, and assignee.",
    'To unassign a task, set `unassign` to true. This cannot be combined with `assigneeId`.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      name: z.string().optional().describe('New title for the task'),
      dueDate: z.string().optional().describe('New ISO 8601 due date'),
      duration: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Duration in minutes, "NONE", or "REMINDER"'),
      status: z.string().optional().describe('New status for the task'),
      projectId: z
        .string()
        .optional()
        .describe('ID of the project to associate the task with'),
      description: z
        .string()
        .optional()
        .describe('New description in GitHub Flavored Markdown'),
      priority: z
        .enum(['ASAP', 'HIGH', 'MEDIUM', 'LOW'])
        .optional()
        .describe('New priority level'),
      labels: z.array(z.string()).optional().describe('Label names to set on the task'),
      assigneeId: z.string().optional().describe('User ID to assign the task to'),
      autoScheduled: z
        .union([
          z.object({
            startDate: z.string().optional().describe('ISO 8601 start date for scheduling'),
            deadlineType: z
              .enum(['HARD', 'SOFT', 'NONE'])
              .optional()
              .describe('Deadline type'),
            schedule: z
              .string()
              .optional()
              .describe('Schedule name. Defaults to "Work Hours".')
          }),
          z.null()
        ])
        .optional()
        .describe('Auto-scheduling settings, or null to disable'),
      moveToWorkspaceId: z
        .string()
        .optional()
        .describe(
          'Move the task to this workspace. Resets project, status, labels, and assignee.'
        ),
      moveAssigneeId: z
        .string()
        .optional()
        .describe('Reassign the task when moving to a new workspace'),
      unassign: z.boolean().optional().describe('Set to true to remove the current assignee')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      name: z.string().describe('Updated task title'),
      description: z.string().optional().describe('Updated description'),
      dueDate: z.string().optional().describe('Updated due date'),
      priority: z.string().optional().describe('Updated priority'),
      status: z.any().optional().describe('Updated status'),
      completed: z.boolean().optional().describe('Whether the task is completed'),
      assignees: z.array(z.any()).optional().describe('Updated assignees'),
      labels: z.array(z.any()).optional().describe('Updated labels'),
      projectId: z.string().optional().describe('Updated project ID'),
      workspaceId: z.string().optional().describe('Workspace ID'),
      scheduledStart: z.string().optional().describe('Updated scheduled start'),
      scheduledEnd: z.string().optional().describe('Updated scheduled end'),
      schedulingIssue: z.boolean().optional().describe('Whether scheduling failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });
    let task: any;

    // Handle unassign
    if (ctx.input.unassign) {
      await client.unassignTask(ctx.input.taskId);
    }

    // Handle move to different workspace
    if (ctx.input.moveToWorkspaceId) {
      task = await client.moveTask(ctx.input.taskId, {
        workspaceId: ctx.input.moveToWorkspaceId,
        assigneeId: ctx.input.moveAssigneeId
      });
    }

    // Handle regular updates
    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.dueDate !== undefined) updateData.dueDate = ctx.input.dueDate;
    if (ctx.input.duration !== undefined) updateData.duration = ctx.input.duration;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.projectId !== undefined) updateData.projectId = ctx.input.projectId;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.priority !== undefined) updateData.priority = ctx.input.priority;
    if (ctx.input.labels !== undefined) updateData.labels = ctx.input.labels;
    if (ctx.input.assigneeId !== undefined) updateData.assigneeId = ctx.input.assigneeId;
    if (ctx.input.autoScheduled !== undefined)
      updateData.autoScheduled = ctx.input.autoScheduled;

    if (Object.keys(updateData).length > 0) {
      task = await client.updateTask(ctx.input.taskId, updateData);
    }

    // If only unassign was performed, fetch the updated task
    if (!task) {
      task = await client.getTask(ctx.input.taskId);
    }

    return {
      output: {
        taskId: task.id,
        name: task.name,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        completed: task.completed,
        assignees: task.assignees,
        labels: task.labels,
        projectId: task.project?.id,
        workspaceId: task.workspace?.id,
        scheduledStart: task.scheduledStart,
        scheduledEnd: task.scheduledEnd,
        schedulingIssue: task.schedulingIssue
      },
      message: `Updated task **${task.name}**${ctx.input.moveToWorkspaceId ? ' (moved to new workspace)' : ''}${ctx.input.unassign ? ' (unassigned)' : ''}`
    };
  })
  .build();
