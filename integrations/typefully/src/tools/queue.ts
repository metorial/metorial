import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

let socialSetId = z
  .string()
  .describe('Social set ID. Call list_social_sets to discover accessible social sets.');
let scheduleSchema = z
  .record(z.string(), z.unknown())
  .describe('Actual social_set_id, timezone, and rules returned by Typefully');

export let getQueue = SlateTool.create(spec, {
  key: 'get_queue',
  name: 'Get Queue',
  description:
    'Inspect free posting slots and scheduled or planned drafts in a date range for a social set. Use list_social_sets to discover its ID.',
  instructions: [
    'Dates use the social set timezone. Ranges cannot exceed 62 days.',
    'Planned drafts do not auto-publish until confirmed with publishAt.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      socialSetId,
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Inclusive start date, YYYY-MM-DD'),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Inclusive end date, YYYY-MM-DD')
    })
  )
  .output(
    z.object({
      queue: z
        .record(z.string(), z.unknown())
        .describe('Actual queue days, slots, and draft metadata returned by Typefully')
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      queue: await new TypefullyClient(ctx.auth.token).getQueue(
        ctx.input.socialSetId,
        ctx.input.startDate,
        ctx.input.endDate
      )
    },
    message: 'Retrieved the publishing queue.'
  }))
  .build();

export let getQueueSchedule = SlateTool.create(spec, {
  key: 'get_queue_schedule',
  name: 'Get Queue Schedule',
  description:
    'Read posting-slot rules and timezone for a social set. Typefully initializes the default schedule if none exists. Use list_social_sets to discover the ID.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ socialSetId }))
  .output(z.object({ schedule: scheduleSchema }))
  .handleInvocation(async ctx => ({
    output: {
      schedule: await new TypefullyClient(ctx.auth.token).getQueueSchedule(
        ctx.input.socialSetId
      )
    },
    message: 'Retrieved queue schedule rules.'
  }))
  .build();

export let replaceQueueSchedule = SlateTool.create(spec, {
  key: 'replace_queue_schedule',
  name: 'Replace Queue Schedule',
  description:
    'Replace all posting-slot rules for a social set. Requires ADMIN access. Use get_queue_schedule to inspect current rules and list_social_sets to discover the ID.',
  instructions: [
    'This replaces the complete rule list atomically. An empty rules array clears the schedule.',
    'Rule times use the social set timezone. Duplicate day and time combinations are rejected.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      socialSetId,
      rules: z.array(
        z.object({
          h: z
            .number()
            .min(0)
            .max(23)
            .describe('Hour in local social set time (whole number, 0-23)'),
          m: z.number().min(0).max(59).describe('Minute (whole number, 0-59)'),
          days: z
            .array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
            .describe('Weekdays for this time')
        })
      )
    })
  )
  .output(z.object({ schedule: scheduleSchema }))
  .handleInvocation(async ctx => {
    let seen = new Set<string>();
    for (let rule of ctx.input.rules) {
      if (!Number.isInteger(rule.h) || !Number.isInteger(rule.m)) {
        throw createApiServiceError('Schedule hours and minutes must be whole numbers.');
      }
      for (let day of rule.days) {
        let slot = `${day}:${rule.h}:${rule.m}`;
        if (seen.has(slot))
          throw createApiServiceError(
            'Schedule rules contain duplicate day and time combinations.'
          );
        seen.add(slot);
      }
    }
    return {
      output: {
        schedule: await new TypefullyClient(ctx.auth.token).replaceQueueSchedule(
          ctx.input.socialSetId,
          ctx.input.rules
        )
      },
      message: 'Replaced queue schedule rules.'
    };
  })
  .build();
