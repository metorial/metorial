import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNonWorkingTime = SlateTool.create(spec, {
  name: 'Create Non-Working Time',
  key: 'create_non_working_time',
  description:
    'Block a calendar from appointment bookings for a specified absence period. Call list_calendars to choose a calendar.',
  tags: { destructive: false }
})
  .input(
    z.object({
      calendarId: z.string().min(1).describe('Calendar ID from list_calendars'),
      startDateTime: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
        .describe('Start of the absence in yyyy-mm-dd HH:MM format'),
      endDateTime: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
        .describe('End of the absence in yyyy-mm-dd HH:MM format, after the start'),
      reason: z.string().optional().describe('Reason or note for the absence')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('API response for the created absence')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.endDateTime <= ctx.input.startDateTime) {
      throw createApiServiceError('The absence end must be after its start.', {
        reason: 'invalid_absence_period'
      });
    }
    let client = new Client(ctx.auth);
    let result = await client.createNonWorkingTime({
      appcalendarid: ctx.input.calendarId,
      startdate: ctx.input.startDateTime,
      enddate: ctx.input.endDateTime,
      reason: ctx.input.reason,
      nwtype: 0
    });
    return {
      output: { result },
      message: `Absence created for calendar ${ctx.input.calendarId} from ${ctx.input.startDateTime} to ${ctx.input.endDateTime}.`
    };
  })
  .build();
