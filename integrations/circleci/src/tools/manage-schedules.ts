import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timetableSchema = z.object({
  perHour: z.number().min(1).max(60).describe('Number of times to trigger per hour'),
  hoursOfDay: z
    .array(z.number().min(0).max(23))
    .describe('UTC hours of the day to run (0-23)'),
  daysOfWeek: z
    .array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']))
    .optional()
    .describe('Days of the week to run'),
  daysOfMonth: z
    .array(z.number().min(1).max(31))
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
    .optional()
    .describe('Months to run')
});

export let manageSchedules = SlateTool.create(spec, {
  name: 'Manage Schedules',
  key: 'manage_schedules',
  description: `Create, list, update, or delete scheduled pipeline triggers for a CircleCI project. Schedules automatically trigger pipelines at specified intervals using a timetable (hours, days, months).`,
  tags: {
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
      timetable: timetableSchema.optional().describe('When to run the schedule')
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
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.projectSlug)
        throw new Error('projectSlug is required for listing schedules.');
      let result = await client.listSchedules(ctx.input.projectSlug);
      let schedules = (result.items || []).map((s: any) => ({
        scheduleId: s.id,
        name: s.name,
        description: s.description,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        timetable: s.timetable
      }));
      return {
        output: { schedules },
        message: `Found **${schedules.length}** schedule(s) for project \`${ctx.input.projectSlug}\`.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.scheduleId) throw new Error('scheduleId is required to get a schedule.');
      let s = await client.getSchedule(ctx.input.scheduleId);
      return {
        output: {
          schedule: {
            scheduleId: s.id,
            name: s.name,
            description: s.description,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            timetable: s.timetable
          }
        },
        message: `Schedule **${s.name}** (ID: ${s.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectSlug)
        throw new Error('projectSlug is required to create a schedule.');
      if (!ctx.input.name) throw new Error('name is required to create a schedule.');
      if (!ctx.input.timetable) throw new Error('timetable is required to create a schedule.');
      if (!ctx.input.parameters)
        throw new Error('parameters are required to create a schedule (must include branch).');

      let s = await client.createSchedule(ctx.input.projectSlug, {
        name: ctx.input.name,
        description: ctx.input.description,
        attributionActor: ctx.input.attributionActor || 'current',
        parameters: ctx.input.parameters,
        timetable: ctx.input.timetable
      });
      return {
        output: {
          schedule: {
            scheduleId: s.id,
            name: s.name,
            description: s.description,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            timetable: s.timetable
          }
        },
        message: `Schedule **${s.name}** created for project \`${ctx.input.projectSlug}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.scheduleId)
        throw new Error('scheduleId is required to update a schedule.');
      let s = await client.updateSchedule(ctx.input.scheduleId, {
        name: ctx.input.name,
        description: ctx.input.description,
        attributionActor: ctx.input.attributionActor,
        parameters: ctx.input.parameters,
        timetable: ctx.input.timetable
      });
      return {
        output: {
          schedule: {
            scheduleId: s.id,
            name: s.name,
            description: s.description,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            timetable: s.timetable
          }
        },
        message: `Schedule **${s.name}** updated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.scheduleId)
        throw new Error('scheduleId is required to delete a schedule.');
      await client.deleteSchedule(ctx.input.scheduleId);
      return {
        output: { deleted: true },
        message: `Schedule \`${ctx.input.scheduleId}\` deleted.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
