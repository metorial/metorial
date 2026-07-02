import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createScheduleOverride = SlateTool.create(spec, {
  name: 'Create Schedule Override',
  key: 'create_schedule_override',
  description: `Create an override on an on-call schedule. Overrides temporarily replace the scheduled on-call person for a specific rotation and layer during a given time window.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      scheduleId: z.string().describe('ID of the schedule to add the override to'),
      rotationId: z.string().describe('ID of the rotation within the schedule'),
      layerId: z.string().describe('ID of the layer within the rotation'),
      startAt: z.string().describe('Start time of the override (ISO 8601 timestamp)'),
      endAt: z.string().describe('End time of the override (ISO 8601 timestamp)'),
      userId: z
        .string()
        .optional()
        .describe(
          'ID of the user who will be on-call during the override. If omitted, creates a gap in coverage.'
        )
    })
  )
  .output(
    z.object({
      overrideId: z.string().optional(),
      scheduleId: z.string(),
      startAt: z.string(),
      endAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createScheduleOverride({
      scheduleId: ctx.input.scheduleId,
      rotationId: ctx.input.rotationId,
      layerId: ctx.input.layerId,
      startAt: ctx.input.startAt,
      endAt: ctx.input.endAt,
      userId: ctx.input.userId
    });

    let override = result.override || {};

    return {
      output: {
        overrideId: override.id || undefined,
        scheduleId: ctx.input.scheduleId,
        startAt: ctx.input.startAt,
        endAt: ctx.input.endAt
      },
      message: `Schedule override created from ${ctx.input.startAt} to ${ctx.input.endAt}.`
    };
  })
  .build();
