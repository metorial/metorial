import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let activityOutputSchema = z.object({
  activityId: z.number().describe('Activity ID'),
  date: z.string().describe('Activity date (YYYY-MM-DD)'),
  description: z.string().optional().describe('Activity description'),
  seconds: z.number().optional().describe('Billable seconds'),
  workedSeconds: z.number().optional().describe('Actual worked seconds'),
  billable: z.boolean().optional().describe('Whether the activity is billable'),
  billed: z.boolean().optional().describe('Whether the activity has been billed'),
  hourlyRate: z.number().optional().describe('Hourly rate applied'),
  tag: z.string().optional().describe('Activity tag'),
  timerStartedAt: z.string().optional().describe('Timer start timestamp if running'),
  project: z.any().optional().describe('Associated project details'),
  task: z.any().optional().describe('Associated task details'),
  customer: z.any().optional().describe('Associated customer details'),
  user: z.any().optional().describe('User who logged the activity'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `Retrieve time tracking entries (activities). Filter by date range, project, task, user, or billing status. By default returns activities for the authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date for filtering (YYYY-MM-DD)'),
      userId: z.number().optional().describe('Filter by user ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      taskId: z.number().optional().describe('Filter by task ID'),
      companyId: z.number().optional().describe('Filter by company ID'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      billed: z.boolean().optional().describe('Filter by billed status'),
      term: z.string().optional().describe('Full-text search term')
    })
  )
  .output(
    z.object({
      activities: z.array(activityOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.from) params.from = ctx.input.from;
    if (ctx.input.to) params.to = ctx.input.to;
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.projectId) params.project_id = ctx.input.projectId;
    if (ctx.input.taskId) params.task_id = ctx.input.taskId;
    if (ctx.input.companyId) params.company_id = ctx.input.companyId;
    if (ctx.input.billable !== undefined) params.billable = ctx.input.billable;
    if (ctx.input.billed !== undefined) params.billed = ctx.input.billed;
    if (ctx.input.term) params.term = ctx.input.term;

    let data = await client.listActivities(params);

    let activities = (data as any[]).map((a: any) => ({
      activityId: a.id,
      date: a.date,
      description: a.description,
      seconds: a.seconds,
      workedSeconds: a.worked_seconds,
      billable: a.billable,
      billed: a.billed,
      hourlyRate: a.hourly_rate,
      tag: a.tag,
      timerStartedAt: a.timer_started_at,
      project: a.project,
      task: a.task,
      customer: a.customer,
      user: a.user,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { activities },
      message: `Found **${activities.length}** activities.`
    };
  })
  .build();

export let createActivity = SlateTool.create(spec, {
  name: 'Create Activity',
  key: 'create_activity',
  description: `Log a new time entry against a project task. Specify date, duration, and optionally a description. Can also start a timer for current-day entries.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Date for the activity (YYYY-MM-DD)'),
      projectId: z.number().describe('Project ID to log time against'),
      taskId: z.number().describe('Task ID within the project'),
      seconds: z
        .number()
        .optional()
        .describe('Duration in seconds (use 0 or omit to start a timer)'),
      hours: z
        .number()
        .optional()
        .describe('Duration in hours (alternative to seconds, e.g. 1.5 for 1h30m)'),
      description: z.string().optional().describe('Description of the work done'),
      billable: z.boolean().optional().describe('Whether this time is billable'),
      tag: z.string().optional().describe('Activity tag/label')
    })
  )
  .output(activityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      date: ctx.input.date,
      project_id: ctx.input.projectId,
      task_id: ctx.input.taskId
    };

    if (ctx.input.hours !== undefined) {
      data.hours = ctx.input.hours;
    } else if (ctx.input.seconds !== undefined) {
      data.seconds = ctx.input.seconds;
    }

    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.tag) data.tag = ctx.input.tag;

    let a = await client.createActivity(data);

    return {
      output: {
        activityId: a.id,
        date: a.date,
        description: a.description,
        seconds: a.seconds,
        workedSeconds: a.worked_seconds,
        billable: a.billable,
        billed: a.billed,
        hourlyRate: a.hourly_rate,
        tag: a.tag,
        timerStartedAt: a.timer_started_at,
        project: a.project,
        task: a.task,
        customer: a.customer,
        user: a.user,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      message: `Created activity on **${a.date}** (ID: ${a.id}).`
    };
  })
  .build();

export let updateActivity = SlateTool.create(spec, {
  name: 'Update Activity',
  key: 'update_activity',
  description: `Update an existing time entry. Modify duration, description, billing status, or tags.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      activityId: z.number().describe('The ID of the activity to update'),
      date: z.string().optional().describe('New date (YYYY-MM-DD)'),
      projectId: z.number().optional().describe('New project ID'),
      taskId: z.number().optional().describe('New task ID'),
      seconds: z.number().optional().describe('New duration in seconds'),
      hours: z.number().optional().describe('New duration in hours'),
      description: z.string().optional().describe('New description'),
      billable: z.boolean().optional().describe('New billable status'),
      tag: z.string().optional().describe('New tag/label')
    })
  )
  .output(activityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {};
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.projectId) data.project_id = ctx.input.projectId;
    if (ctx.input.taskId) data.task_id = ctx.input.taskId;
    if (ctx.input.hours !== undefined) data.hours = ctx.input.hours;
    else if (ctx.input.seconds !== undefined) data.seconds = ctx.input.seconds;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.tag !== undefined) data.tag = ctx.input.tag;

    let a = await client.updateActivity(ctx.input.activityId, data);

    return {
      output: {
        activityId: a.id,
        date: a.date,
        description: a.description,
        seconds: a.seconds,
        workedSeconds: a.worked_seconds,
        billable: a.billable,
        billed: a.billed,
        hourlyRate: a.hourly_rate,
        tag: a.tag,
        timerStartedAt: a.timer_started_at,
        project: a.project,
        task: a.task,
        customer: a.customer,
        user: a.user,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      message: `Updated activity **${a.id}** on ${a.date}.`
    };
  })
  .build();

export let deleteActivity = SlateTool.create(spec, {
  name: 'Delete Activity',
  key: 'delete_activity',
  description: `Delete a time entry. Only unbilled and unlocked activities can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      activityId: z.number().describe('The ID of the activity to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteActivity(ctx.input.activityId);

    return {
      output: { success: true },
      message: `Deleted activity **${ctx.input.activityId}**.`
    };
  })
  .build();

export let manageTimer = SlateTool.create(spec, {
  name: 'Manage Timer',
  key: 'manage_timer',
  description: `Start or stop a timer on an activity. Timers can only be used for current-day activities.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      activityId: z.number().describe('The ID of the activity'),
      action: z.enum(['start', 'stop']).describe('Whether to start or stop the timer')
    })
  )
  .output(activityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let a =
      ctx.input.action === 'start'
        ? await client.startTimer(ctx.input.activityId)
        : await client.stopTimer(ctx.input.activityId);

    return {
      output: {
        activityId: a.id,
        date: a.date,
        description: a.description,
        seconds: a.seconds,
        workedSeconds: a.worked_seconds,
        billable: a.billable,
        billed: a.billed,
        hourlyRate: a.hourly_rate,
        tag: a.tag,
        timerStartedAt: a.timer_started_at,
        project: a.project,
        task: a.task,
        customer: a.customer,
        user: a.user,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      message: `Timer **${ctx.input.action === 'start' ? 'started' : 'stopped'}** on activity **${a.id}**.`
    };
  })
  .build();
