import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError, validatePipelineParameters } from '../lib/validation';
import { spec } from '../spec';

let timetableSchema = z.object({
  perHour: z.number().min(1).max(60).describe('Number of times to trigger per hour'),
  hoursOfDay: z
    .array(z.number().min(0).max(23))
    .min(1)
    .describe('UTC hours of the day to run (0-23)'),
  daysOfWeek: z
    .array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']))
    .min(1)
    .optional()
    .describe('Days of the week to run'),
  daysOfMonth: z
    .array(z.number().min(1).max(31))
    .min(1)
    .optional()
    .describe('Days of the month to run (1-31)'),
  months: z
    .array(
      z.enum([
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC'
      ])
    )
    .min(1)
    .optional()
    .describe('Months to run')
});

export let manageSchedules = SlateTool.create(spec, {
  name: 'Manage Schedules',
  key: 'manage_schedules',
  description: `Create, list, update, or delete scheduled pipeline triggers for a CircleCI project. Schedules automatically trigger pipelines at specified intervals using a timetable (hours, days, months).`,
  constraints: [
    'These schedule endpoints support GitHub OAuth and Bitbucket Cloud pipeline definitions. For GitHub App projects, use pipeline definition triggers in CircleCI.'
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
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required for list and create)'),
      scheduleId: z
        .string()
        .optional()
        .describe('Schedule UUID (required for get, update, and delete)'),
      name: z.string().optional().describe('Schedule name (required for create)'),
      description: z.string().optional().describe('Schedule description'),
      attributionActor: z
        .enum(['current', 'system'])
        .optional()
        .describe('Who the scheduled pipeline runs are attributed to'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Pipeline parameters to pass with the scheduled trigger (must include branch)'
        ),
      timetable: timetableSchema.optional().describe('When to run the schedule'),
      pageToken: z.string().optional().describe('Pagination token for the list action')
    })
  )
  .output(
    z.object({
      schedules: z
        .array(
          z.object({
            scheduleId: z.string(),
            name: z.string(),
            description: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional(),
            timetable: z.any().optional()
          })
        )
        .optional(),
      schedule: z
        .object({
          scheduleId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          timetable: z.any().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      nextPageToken: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.pageToken && ctx.input.action !== 'list') {
      throw circleCiValidationError('pageToken is only supported for the list action.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.projectSlug)
        throw circleCiValidationError('projectSlug is required for listing schedules.');
      let result = await client.listSchedules(ctx.input.projectSlug, ctx.input.pageToken);
      let schedules = (result.items || []).map(mapSchedule);
      return {
        output: { schedules, nextPageToken: result.next_page_token },
        message: `Found **${schedules.length}** schedule(s) for project \`${ctx.input.projectSlug}\`.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.scheduleId)
        throw circleCiValidationError('scheduleId is required to get a schedule.');
      let s = await client.getSchedule(ctx.input.scheduleId);
      return {
        output: { schedule: mapSchedule(s) },
        message: `Schedule **${s.name}** (ID: ${s.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectSlug)
        throw circleCiValidationError('projectSlug is required to create a schedule.');
      if (!ctx.input.name)
        throw circleCiValidationError('name is required to create a schedule.');
      if (!ctx.input.timetable)
        throw circleCiValidationError('timetable is required to create a schedule.');
      if (!ctx.input.parameters)
        throw circleCiValidationError(
          'parameters are required to create a schedule and must include branch or tag.'
        );

      validateScheduleTimetable(ctx.input.timetable);
      validateScheduleParameters(ctx.input.parameters);

      let s = await client.createSchedule(ctx.input.projectSlug, {
        name: ctx.input.name,
        description: ctx.input.description,
        attributionActor: ctx.input.attributionActor || 'current',
        parameters: ctx.input.parameters,
        timetable: ctx.input.timetable
      });
      return {
        output: { schedule: mapSchedule(s) },
        message: `Schedule **${s.name}** created for project \`${ctx.input.projectSlug}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.scheduleId)
        throw circleCiValidationError('scheduleId is required to update a schedule.');
      if (
        ctx.input.name === undefined &&
        ctx.input.description === undefined &&
        ctx.input.attributionActor === undefined &&
        ctx.input.parameters === undefined &&
        ctx.input.timetable === undefined
      ) {
        throw circleCiValidationError('Provide at least one schedule field to update.');
      }
      if (ctx.input.timetable) validateScheduleTimetable(ctx.input.timetable);
      if (ctx.input.parameters) validateScheduleParameters(ctx.input.parameters);
      let s = await client.updateSchedule(ctx.input.scheduleId, {
        name: ctx.input.name,
        description: ctx.input.description,
        attributionActor: ctx.input.attributionActor,
        parameters: ctx.input.parameters,
        timetable: ctx.input.timetable
      });
      return {
        output: { schedule: mapSchedule(s) },
        message: `Schedule **${s.name}** updated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.scheduleId)
        throw circleCiValidationError('scheduleId is required to delete a schedule.');
      await client.deleteSchedule(ctx.input.scheduleId);
      return {
        output: { deleted: true },
        message: `Schedule \`${ctx.input.scheduleId}\` deleted.`
      };
    }

    throw circleCiValidationError(`Unknown action: ${ctx.input.action}`);
  })
  .build();

let mapSchedule = (schedule: any) => ({
  scheduleId: schedule.id,
  name: schedule.name,
  description: schedule.description,
  // CircleCI's schedule API uses hyphenated timestamp keys. Keep underscore
  // fallbacks for responses from older server versions.
  createdAt: schedule['created-at'] ?? schedule.created_at,
  updatedAt: schedule['updated-at'] ?? schedule.updated_at,
  timetable: schedule.timetable
});

let validateScheduleTimetable = (timetable: z.infer<typeof timetableSchema>) => {
  let hasDaysOfWeek = Boolean(timetable.daysOfWeek?.length);
  let hasDaysOfMonth = Boolean(timetable.daysOfMonth?.length);
  if (hasDaysOfWeek === hasDaysOfMonth) {
    throw circleCiValidationError(
      'A schedule timetable must provide exactly one of daysOfWeek or daysOfMonth.'
    );
  }
};

let validateScheduleParameters = (parameters: Record<string, unknown>) => {
  let branch = parameters.branch;
  let tag = parameters.tag;
  if (
    (typeof branch !== 'string' || branch.length === 0) ===
    (typeof tag !== 'string' || tag.length === 0)
  ) {
    throw circleCiValidationError(
      'Schedule parameters must contain exactly one non-empty branch or tag.'
    );
  }
  validatePipelineParameters(parameters);
};
