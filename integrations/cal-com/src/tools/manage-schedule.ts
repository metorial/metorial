import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calComServiceError } from '../lib/errors';
import { spec } from '../spec';

let availabilitySchema = z.object({
  days: z
    .array(z.string())
    .describe('Weekday names for this availability window, such as monday or friday'),
  startTime: z.string().describe('Start time in 24h format (e.g., "09:00")'),
  endTime: z.string().describe('End time in 24h format (e.g., "17:00")')
});

let overrideSchema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format'),
  startTime: z.string().optional().describe('Override start time in 24h format'),
  endTime: z.string().optional().describe('Override end time in 24h format')
});

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `Create, update, delete, retrieve, or list availability schedules. Schedules define when a user can be booked. Each user can have multiple schedules with one set as default.`,
  instructions: [
    'Availability times use 24-hour format (e.g., "08:00", "17:00").',
    'Availability days use weekday strings such as monday, tuesday, wednesday.',
    'Default availability is Mon-Fri 09:00-17:00 if not specified.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'get_default', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      scheduleId: z
        .number()
        .optional()
        .describe('Schedule ID (required for get, update, and delete)'),
      name: z.string().optional().describe('Name of the schedule'),
      timeZone: z
        .string()
        .optional()
        .describe('Time zone for the schedule (e.g., America/New_York)'),
      isDefault: z.boolean().optional().describe('Whether this is the default schedule'),
      availability: z.array(availabilitySchema).optional().describe('Availability windows'),
      overrides: z
        .array(overrideSchema)
        .optional()
        .describe('Date-specific availability overrides')
    })
  )
  .output(
    z.object({
      schedules: z.array(z.any()).optional().describe('List of schedules (for list action)'),
      schedule: z.any().optional().describe('Schedule details (for create/update)'),
      result: z.any().optional().describe('Result (for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    switch (ctx.input.action) {
      case 'list': {
        let schedules = await client.listSchedules();
        let list = Array.isArray(schedules) ? schedules : [];
        return {
          output: { schedules: list },
          message: `Found **${list.length}** schedule(s).`
        };
      }
      case 'get': {
        if (!ctx.input.scheduleId) {
          throw calComServiceError('scheduleId is required for get.');
        }

        let schedule = await client.getSchedule(ctx.input.scheduleId);
        return {
          output: { schedule },
          message: `Schedule **${ctx.input.scheduleId}** retrieved.`
        };
      }
      case 'get_default': {
        let schedule = await client.getDefaultSchedule();
        return {
          output: { schedule },
          message: 'Default schedule retrieved.'
        };
      }
      case 'create': {
        if (!ctx.input.name) {
          throw calComServiceError('name is required for create.');
        }

        let body: Record<string, any> = {};
        if (ctx.input.name) body.name = ctx.input.name;
        if (ctx.input.timeZone) body.timeZone = ctx.input.timeZone;
        if (ctx.input.isDefault !== undefined) body.isDefault = ctx.input.isDefault;
        if (ctx.input.availability) body.availability = ctx.input.availability;
        if (ctx.input.overrides) body.overrides = ctx.input.overrides;
        let schedule = await client.createSchedule(body);
        return {
          output: { schedule },
          message: `Schedule **${ctx.input.name || 'New Schedule'}** created.`
        };
      }
      case 'update': {
        if (!ctx.input.scheduleId) {
          throw calComServiceError('scheduleId is required for update.');
        }

        let body: Record<string, any> = {};
        if (ctx.input.name) body.name = ctx.input.name;
        if (ctx.input.timeZone) body.timeZone = ctx.input.timeZone;
        if (ctx.input.isDefault !== undefined) body.isDefault = ctx.input.isDefault;
        if (ctx.input.availability) body.availability = ctx.input.availability;
        if (ctx.input.overrides) body.overrides = ctx.input.overrides;
        let schedule = await client.updateSchedule(ctx.input.scheduleId, body);
        return {
          output: { schedule },
          message: `Schedule **${ctx.input.scheduleId}** updated.`
        };
      }
      case 'delete': {
        if (!ctx.input.scheduleId) {
          throw calComServiceError('scheduleId is required for delete.');
        }

        let result = await client.deleteSchedule(ctx.input.scheduleId);
        return {
          output: { result },
          message: `Schedule **${ctx.input.scheduleId}** deleted.`
        };
      }
    }

    throw calComServiceError(`Unsupported schedule action: ${ctx.input.action}`);
  })
  .build();
