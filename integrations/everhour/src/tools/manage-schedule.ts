import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let assignmentSchema = z.object({
  assignmentId: z.number().describe('Assignment ID'),
  type: z.string().describe('Assignment type: project or time-off'),
  userId: z.number().describe('Assigned user ID'),
  startDate: z.string().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().describe('End date (YYYY-MM-DD)'),
  days: z.number().optional().describe('Number of working days'),
  timeSeconds: z.number().optional().describe('Scheduled time in seconds'),
  projectId: z.string().optional().describe('Project ID (for project assignments)'),
  taskId: z.string().optional().describe('Task ID (for task-level assignments)'),
  timeOffTypeId: z.number().optional().describe('Time off type ID (for time-off assignments)'),
  timeOffPeriod: z
    .string()
    .optional()
    .describe('Time off period: full-day, half-day, or quarter-day'),
  status: z.string().optional().describe('Status (for time-off: pending or approved)')
});

export let listAssignments = SlateTool.create(spec, {
  name: 'List Assignments',
  key: 'list_assignments',
  description: `List resource planner assignments (project assignments and time-off). Filter by type, project, task, client, or date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['assignment', 'time-off'])
        .optional()
        .describe('Filter by assignment type'),
      projectId: z.string().optional().describe('Filter by project ID'),
      taskId: z.string().optional().describe('Filter by task ID'),
      clientId: z.number().optional().describe('Filter by client ID'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      assignments: z.array(assignmentSchema).describe('List of assignments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let params: any = {};
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.projectId) params.project = ctx.input.projectId;
    if (ctx.input.taskId) params.task = ctx.input.taskId;
    if (ctx.input.clientId) params.client = ctx.input.clientId;
    if (ctx.input.from) params.from = ctx.input.from;
    if (ctx.input.to) params.to = ctx.input.to;

    let assignments = await client.listAssignments(params);
    let mapped = (Array.isArray(assignments) ? assignments : []).map((a: any) => ({
      assignmentId: a.id,
      type: a.type,
      userId: a.user,
      startDate: a.startDate,
      endDate: a.endDate,
      days: a.days ?? undefined,
      timeSeconds: a.time ?? undefined,
      projectId: a.project ?? undefined,
      taskId: a.task ?? undefined,
      timeOffTypeId: a.timeOffType ?? undefined,
      timeOffPeriod: a.timeOffPeriod ?? undefined,
      status: a.status ?? undefined
    }));

    return {
      output: { assignments: mapped },
      message: `Found **${mapped.length}** assignment(s).`
    };
  });

export let createAssignment = SlateTool.create(spec, {
  name: 'Create Assignment',
  key: 'create_assignment',
  description: `Create a resource planner assignment (project work or time-off). For project assignments, specify a project and scheduled time. For time-off, specify the time-off type.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      type: z.enum(['project', 'time-off']).describe('Assignment type'),
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().describe('End date (YYYY-MM-DD)'),
      userId: z.number().optional().describe('Single user ID to assign'),
      userIds: z.array(z.number()).optional().describe('Multiple user IDs to assign'),
      projectId: z.string().optional().describe('Project ID (required for project type)'),
      taskId: z.string().optional().describe('Task ID for task-level scheduling'),
      timeSeconds: z
        .number()
        .optional()
        .describe('Scheduled time in seconds (for project type)'),
      timeOffTypeId: z
        .number()
        .optional()
        .describe(
          'Time off type ID (required for time-off type). Call list_time_off_types to discover IDs.'
        ),
      timeOffPeriod: z
        .enum([
          'full-day',
          'half-day',
          'quarter-day',
          'half-of-day',
          'quarter-of-day',
          'half-and-quarter-of-day'
        ])
        .optional()
        .describe(
          'Time off period. half-day and quarter-day are accepted aliases for half-of-day and quarter-of-day.'
        ),
      status: z
        .enum(['pending', 'approved'])
        .optional()
        .describe('Initial status (for time-off)'),
      forceOverride: z.boolean().optional().describe('Force override existing assignments')
    })
  )
  .output(
    z.object({
      assignments: z
        .array(assignmentSchema)
        .describe('Created assignments (may be multiple when assigning multiple users)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    if (ctx.input.userId !== undefined && ctx.input.userIds !== undefined) {
      throw createApiServiceError('Provide userId or userIds, not both.');
    }
    if (ctx.input.userId === undefined && !ctx.input.userIds?.length) {
      throw createApiServiceError(
        'Provide userId or a non-empty userIds list. Call list_users to discover IDs.'
      );
    }
    if (ctx.input.type === 'project' && !ctx.input.projectId?.trim()) {
      throw createApiServiceError(
        'Project assignments require projectId. Call list_projects to discover IDs.'
      );
    }
    if (ctx.input.type === 'time-off' && ctx.input.timeOffTypeId === undefined) {
      throw createApiServiceError(
        'Time-off assignments require timeOffTypeId. Call list_time_off_types to discover IDs.'
      );
    }
    if (
      ctx.input.type === 'project' &&
      (ctx.input.timeOffTypeId !== undefined ||
        ctx.input.timeOffPeriod !== undefined ||
        ctx.input.status !== undefined)
    ) {
      throw createApiServiceError(
        'timeOffTypeId, timeOffPeriod, and status apply only to time-off assignments.'
      );
    }
    if (
      ctx.input.type === 'time-off' &&
      (ctx.input.projectId !== undefined ||
        ctx.input.taskId !== undefined ||
        ctx.input.timeSeconds !== undefined)
    ) {
      throw createApiServiceError(
        'projectId, taskId, and timeSeconds apply only to project assignments.'
      );
    }
    let data: any = {
      type: ctx.input.type,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      forceOverride: ctx.input.forceOverride
    };

    if (ctx.input.userIds) data.users = ctx.input.userIds;
    else if (ctx.input.userId !== undefined) data.user = ctx.input.userId;

    if (ctx.input.projectId) data.project = ctx.input.projectId;
    if (ctx.input.taskId) data.task = ctx.input.taskId;
    if (ctx.input.timeSeconds !== undefined) data.time = ctx.input.timeSeconds;
    if (ctx.input.timeOffTypeId !== undefined) data.timeOffType = ctx.input.timeOffTypeId;
    if (ctx.input.timeOffPeriod) {
      data.timeOffPeriod =
        ctx.input.timeOffPeriod === 'half-day'
          ? 'half-of-day'
          : ctx.input.timeOffPeriod === 'quarter-day'
            ? 'quarter-of-day'
            : ctx.input.timeOffPeriod;
    }
    if (ctx.input.status) data.status = ctx.input.status;

    let result = await client.createAssignment(data);
    let assignments = Array.isArray(result) ? result : [result];
    let mapped = assignments.map((a: any) => ({
      assignmentId: a.id,
      type: a.type,
      userId: a.user,
      startDate: a.startDate,
      endDate: a.endDate,
      days: a.days ?? undefined,
      timeSeconds: a.time ?? undefined,
      projectId: a.project ?? undefined,
      taskId: a.task ?? undefined,
      timeOffTypeId: a.timeOffType ?? undefined,
      timeOffPeriod: a.timeOffPeriod ?? undefined,
      status: a.status ?? undefined
    }));

    return {
      output: { assignments: mapped },
      message: `Created **${mapped.length}** assignment(s) from ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  });

export let updateAssignment = SlateTool.create(spec, {
  name: 'Update Assignment',
  key: 'update_assignment',
  description: `Update an existing assignment's dates, time, project, or task.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      assignmentId: z.number().describe('Assignment ID to update'),
      startDate: z.string().optional().describe('Updated start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Updated end date (YYYY-MM-DD)'),
      timeSeconds: z.number().optional().describe('Updated scheduled time in seconds'),
      projectId: z.string().optional().describe('Updated project ID'),
      taskId: z.string().optional().describe('Updated task ID')
    })
  )
  .output(assignmentSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { assignmentId, timeSeconds, projectId, taskId, ...rest } = ctx.input;
    let result = await client.updateAssignment(assignmentId, {
      ...rest,
      time: timeSeconds,
      project: projectId,
      task: taskId
    });
    return {
      output: {
        assignmentId: result.id,
        type: result.type,
        userId: result.user,
        startDate: result.startDate,
        endDate: result.endDate,
        days: result.days ?? undefined,
        timeSeconds: result.time ?? undefined,
        projectId: result.project ?? undefined,
        taskId: result.task ?? undefined,
        timeOffTypeId: result.timeOffType ?? undefined,
        timeOffPeriod: result.timeOffPeriod ?? undefined,
        status: result.status ?? undefined
      },
      message: `Updated assignment ${assignmentId}.`
    };
  });

export let deleteAssignment = SlateTool.create(spec, {
  name: 'Delete Assignment',
  key: 'delete_assignment',
  description: `Delete a resource planner assignment.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      assignmentId: z.number().describe('Assignment ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteAssignment(ctx.input.assignmentId);
    return {
      output: { success: true },
      message: `Deleted assignment ${ctx.input.assignmentId}.`
    };
  });

export let listTimeOffTypes = SlateTool.create(spec, {
  name: 'List Time Off Types',
  key: 'list_time_off_types',
  description:
    'List available time-off categories and their IDs for creating time-off assignments.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      timeOffTypes: z.array(
        z.object({
          timeOffTypeId: z.number().describe('Time-off type ID for create_assignment'),
          name: z.string().describe('Time-off type name'),
          color: z.string().optional().describe('Display color'),
          paid: z.boolean().optional().describe('Whether this time off is paid'),
          description: z.string().optional().describe('Time-off type description')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let types = await new EverhourClient(ctx.auth.token).listTimeOffTypes();
    let timeOffTypes = types.map((type: any) => ({
      timeOffTypeId: type.id,
      name: type.name,
      color: type.color ?? undefined,
      paid: type.paid ?? undefined,
      description: type.description ?? undefined
    }));
    return {
      output: { timeOffTypes },
      message: `Found **${timeOffTypes.length}** time-off type(s).`
    };
  });
