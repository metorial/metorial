import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `Create, get, update, delete, or list schedules. Schedules automatically start Actors or Tasks at specified times using cron expressions. Each schedule supports up to 10 Actors and 10 Tasks.`,
  instructions: [
    'Use action "list" to list all schedules.',
    'Use action "get" with scheduleId to get schedule details.',
    'Use action "create" with name, cronExpression, and actions to create a new schedule.',
    'Use action "update" with scheduleId and fields to update.',
    'Use action "delete" with scheduleId to delete a schedule.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      scheduleId: z
        .string()
        .optional()
        .describe('Schedule ID (required for get/update/delete)'),
      name: z.string().optional().describe('Schedule name (required for create)'),
      cronExpression: z
        .string()
        .optional()
        .describe('Cron expression (e.g. "0 0 * * *" for daily at midnight)'),
      timezone: z.string().optional().describe('Timezone (e.g. "America/New_York")'),
      isEnabled: z.boolean().optional().describe('Whether the schedule is active'),
      isExclusive: z
        .boolean()
        .optional()
        .describe('If true, skip scheduled runs if previous is still running'),
      description: z.string().optional().describe('Schedule description'),
      actions: z
        .array(
          z.object({
            type: z.enum(['RUN_ACTOR', 'RUN_ACTOR_TASK']).describe('Action type'),
            actorId: z.string().optional().describe('Actor ID (for RUN_ACTOR)'),
            actorTaskId: z.string().optional().describe('Task ID (for RUN_ACTOR_TASK)'),
            input: z.any().optional().describe('Override input for the run'),
            build: z.string().optional().describe('Build tag'),
            timeout: z.number().optional().describe('Timeout in seconds'),
            memory: z.number().optional().describe('Memory in MB')
          })
        )
        .optional()
        .describe('Scheduled actions (Actors and Tasks to run)'),
      limit: z.number().optional().default(25).describe('Max items for list'),
      offset: z.number().optional().default(0).describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      scheduleId: z.string().optional().describe('Schedule ID'),
      name: z.string().optional().describe('Schedule name'),
      cronExpression: z.string().optional().describe('Cron expression'),
      timezone: z.string().optional().describe('Timezone'),
      isEnabled: z.boolean().optional().describe('Whether enabled'),
      isExclusive: z.boolean().optional().describe('Whether exclusive'),
      description: z.string().optional().describe('Description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      nextRunAt: z.string().optional().describe('Next scheduled run time'),
      actions: z.array(z.record(z.string(), z.any())).optional().describe('Scheduled actions'),
      schedules: z
        .array(
          z.object({
            scheduleId: z.string().describe('Schedule ID'),
            name: z.string().optional().describe('Schedule name'),
            cronExpression: z.string().optional().describe('Cron expression'),
            isEnabled: z.boolean().optional().describe('Whether enabled'),
            nextRunAt: z.string().optional().describe('Next run time')
          })
        )
        .optional()
        .describe('Schedule list (for list action)'),
      total: z.number().optional().describe('Total schedules'),
      deleted: z.boolean().optional().describe('Whether deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listSchedules({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let schedules = result.items.map(item => ({
        scheduleId: item.id,
        name: item.name,
        cronExpression: item.cronExpression,
        isEnabled: item.isEnabled,
        nextRunAt: item.nextRunAt
      }));

      return {
        output: { schedules, total: result.total },
        message: `Found **${result.total}** schedule(s), showing **${schedules.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let schedule = await client.getSchedule(ctx.input.scheduleId!);
      return {
        output: {
          scheduleId: schedule.id,
          name: schedule.name,
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          isEnabled: schedule.isEnabled,
          isExclusive: schedule.isExclusive,
          description: schedule.description,
          createdAt: schedule.createdAt,
          modifiedAt: schedule.modifiedAt,
          nextRunAt: schedule.nextRunAt,
          actions: schedule.actions
        },
        message: `Retrieved schedule **${schedule.name}** (\`${schedule.id}\`).`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {
        name: ctx.input.name,
        cronExpression: ctx.input.cronExpression
      };
      if (ctx.input.timezone !== undefined) body.timezone = ctx.input.timezone;
      if (ctx.input.isEnabled !== undefined) body.isEnabled = ctx.input.isEnabled;
      if (ctx.input.isExclusive !== undefined) body.isExclusive = ctx.input.isExclusive;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.actions !== undefined) {
        body.actions = ctx.input.actions.map(a => {
          let action: Record<string, any> = { type: a.type };
          if (a.actorId !== undefined) action.actorId = a.actorId;
          if (a.actorTaskId !== undefined) action.actorTaskId = a.actorTaskId;
          if (a.input !== undefined) action.input = a.input;
          if (a.build !== undefined) action.build = a.build;
          if (a.timeout !== undefined) action.timeoutSecs = a.timeout;
          if (a.memory !== undefined) action.memoryMbytes = a.memory;
          return action;
        });
      }

      let schedule = await client.createSchedule(body);
      return {
        output: {
          scheduleId: schedule.id,
          name: schedule.name,
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          isEnabled: schedule.isEnabled,
          isExclusive: schedule.isExclusive,
          createdAt: schedule.createdAt,
          actions: schedule.actions
        },
        message: `Created schedule **${schedule.name}** (\`${schedule.id}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.cronExpression !== undefined)
        body.cronExpression = ctx.input.cronExpression;
      if (ctx.input.timezone !== undefined) body.timezone = ctx.input.timezone;
      if (ctx.input.isEnabled !== undefined) body.isEnabled = ctx.input.isEnabled;
      if (ctx.input.isExclusive !== undefined) body.isExclusive = ctx.input.isExclusive;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.actions !== undefined) {
        body.actions = ctx.input.actions.map(a => {
          let action: Record<string, any> = { type: a.type };
          if (a.actorId !== undefined) action.actorId = a.actorId;
          if (a.actorTaskId !== undefined) action.actorTaskId = a.actorTaskId;
          if (a.input !== undefined) action.input = a.input;
          if (a.build !== undefined) action.build = a.build;
          if (a.timeout !== undefined) action.timeoutSecs = a.timeout;
          if (a.memory !== undefined) action.memoryMbytes = a.memory;
          return action;
        });
      }

      let schedule = await client.updateSchedule(ctx.input.scheduleId!, body);
      return {
        output: {
          scheduleId: schedule.id,
          name: schedule.name,
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          isEnabled: schedule.isEnabled,
          isExclusive: schedule.isExclusive,
          modifiedAt: schedule.modifiedAt,
          actions: schedule.actions
        },
        message: `Updated schedule **${schedule.name}** (\`${schedule.id}\`).`
      };
    }

    // delete
    await client.deleteSchedule(ctx.input.scheduleId!);
    return {
      output: { scheduleId: ctx.input.scheduleId, deleted: true },
      message: `Deleted schedule \`${ctx.input.scheduleId}\`.`
    };
  })
  .build();
