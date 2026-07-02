import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  paginationInput,
  pickDefined,
  requireArray,
  requireString,
  validateRunOptions
} from './shared';

let scheduleActionSchema = z.object({
  type: z.enum(['RUN_ACTOR', 'RUN_ACTOR_TASK']).describe('Scheduled action type'),
  actorId: z.string().optional().describe('Actor ID; required for RUN_ACTOR'),
  actorTaskId: z.string().optional().describe('Task ID; required for RUN_ACTOR_TASK'),
  input: z.any().optional().describe('Run input override'),
  build: z.string().optional().describe('Build tag or number'),
  timeout: z.number().optional().describe('Run timeout in seconds'),
  memory: z.number().optional().describe('Run memory in MB')
});

let mapSchedule = (schedule: Record<string, any>) => ({
  scheduleId: schedule.id,
  name: schedule.name,
  cronExpression: schedule.cronExpression,
  timezone: schedule.timezone,
  isEnabled: schedule.isEnabled,
  isExclusive: schedule.isExclusive,
  description: schedule.description,
  createdAt: schedule.createdAt,
  modifiedAt: schedule.modifiedAt,
  nextRunAt: schedule.nextRunAt ?? undefined,
  actions: schedule.actions
});

let toScheduleActions = (actions: z.infer<typeof scheduleActionSchema>[] | undefined) => {
  if (!actions) return undefined;

  return requireArray(actions, 'actions').map((action, index) => {
    validateRunOptions(action);
    if (action.type === 'RUN_ACTOR') {
      requireString(action.actorId, `actions[${index}].actorId`, 'RUN_ACTOR');
    } else {
      requireString(action.actorTaskId, `actions[${index}].actorTaskId`, 'RUN_ACTOR_TASK');
    }

    let runOptions = pickDefined({
      build: action.build,
      timeoutSecs: action.timeout,
      memoryMbytes: action.memory
    });

    return pickDefined({
      type: action.type,
      actorId: action.actorId,
      actorTaskId: action.actorTaskId,
      input: action.input,
      runOptions: Object.keys(runOptions).length > 0 ? runOptions : undefined
    });
  });
};

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `Create, get, update, delete, or list Apify schedules that run Actors or Actor Tasks on a cron expression.`,
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
      scheduleId: z.string().optional().describe('Schedule ID for get/update/delete'),
      name: z.string().optional().describe('Schedule name; required for create'),
      cronExpression: z.string().optional().describe('Cron expression for create/update'),
      timezone: z.string().optional().describe('Timezone, for example America/New_York'),
      isEnabled: z.boolean().optional().describe('Whether the schedule is active'),
      isExclusive: z
        .boolean()
        .optional()
        .describe('Skip scheduled runs when a previous run is still active'),
      description: z.string().optional().describe('Schedule description'),
      actions: z.array(scheduleActionSchema).optional().describe('Scheduled actions'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      scheduleId: z.string().optional().describe('Schedule ID'),
      name: z.string().optional(),
      cronExpression: z.string().optional(),
      timezone: z.string().optional(),
      isEnabled: z.boolean().optional(),
      isExclusive: z.boolean().optional(),
      description: z.string().optional(),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      nextRunAt: z.string().optional(),
      actions: z.array(z.record(z.string(), z.any())).optional(),
      schedules: z.array(z.record(z.string(), z.any())).optional(),
      total: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listSchedules({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        desc: ctx.input.descending
      });
      let schedules = result.items.map(mapSchedule);
      return {
        output: { schedules, total: result.total },
        message: `Found **${result.total}** schedule(s), showing **${schedules.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let scheduleId = requireString(ctx.input.scheduleId, 'scheduleId', 'get');
      let schedule = await client.getSchedule(scheduleId);
      return {
        output: mapSchedule(schedule),
        message: `Retrieved schedule **${schedule.name ?? scheduleId}** (\`${schedule.id ?? scheduleId}\`).`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireString(ctx.input.name, 'name', 'create');
      let cronExpression = requireString(ctx.input.cronExpression, 'cronExpression', 'create');
      let body = pickDefined({
        name,
        cronExpression,
        timezone: ctx.input.timezone,
        isEnabled: ctx.input.isEnabled,
        isExclusive: ctx.input.isExclusive,
        description: ctx.input.description,
        actions: toScheduleActions(ctx.input.actions)
      });
      let schedule = await client.createSchedule(body);
      return {
        output: mapSchedule(schedule),
        message: `Created schedule **${schedule.name ?? name}** (\`${schedule.id}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      let scheduleId = requireString(ctx.input.scheduleId, 'scheduleId', 'update');
      let body = pickDefined({
        name: ctx.input.name,
        cronExpression: ctx.input.cronExpression,
        timezone: ctx.input.timezone,
        isEnabled: ctx.input.isEnabled,
        isExclusive: ctx.input.isExclusive,
        description: ctx.input.description,
        actions: toScheduleActions(ctx.input.actions)
      });
      ensureAtLeastOne(body, 'update the schedule');
      let schedule = await client.updateSchedule(scheduleId, body);
      return {
        output: mapSchedule(schedule),
        message: `Updated schedule **${schedule.name ?? scheduleId}** (\`${schedule.id ?? scheduleId}\`).`
      };
    }

    let scheduleId = requireString(ctx.input.scheduleId, 'scheduleId', 'delete');
    await client.deleteSchedule(scheduleId);
    return {
      output: { scheduleId, deleted: true },
      message: `Deleted schedule \`${scheduleId}\`.`
    };
  })
  .build();
