import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let scheduleDowntime = SlateTool.create(spec, {
  name: 'Schedule Downtime',
  key: 'schedule_downtime',
  description: `Schedule a downtime to temporarily mute monitoring notifications. Target specific monitors by ID or by tags, and scope the downtime to specific resources.`,
  instructions: [
    'Scope is required and defines which resources are affected, e.g. "env:staging" or "*" for all.',
    'Provide either monitorId or monitorTags to target specific monitors.',
    'Use start/end as ISO 8601 timestamps for the downtime window.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scope: z
        .string()
        .describe('Downtime scope, e.g. "env:staging", "host:myhost", or "*" for all'),
      monitorId: z.number().optional().describe('Specific monitor ID to mute'),
      monitorTags: z
        .array(z.string())
        .optional()
        .describe('Monitor tags to mute, e.g. ["service:web"]'),
      message: z
        .string()
        .optional()
        .describe('Message to include with the downtime notification'),
      start: z
        .string()
        .optional()
        .describe('Start time as ISO 8601 string. Defaults to now if not provided.'),
      end: z
        .string()
        .optional()
        .describe('End time as ISO 8601 string. If omitted, downtime is indefinite.'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the schedule, e.g. "America/New_York"')
    })
  )
  .output(
    z.object({
      downtimeId: z.string().describe('ID of the created downtime'),
      scope: z.string().optional().describe('Downtime scope'),
      status: z.string().optional().describe('Downtime status'),
      message: z.string().optional().describe('Downtime message')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let schedule: any;
    if (ctx.input.start || ctx.input.end) {
      schedule = {};
      if (ctx.input.start) schedule.start = ctx.input.start;
      if (ctx.input.end) schedule.end = ctx.input.end;
      if (ctx.input.timezone) schedule.timezone = ctx.input.timezone;
    }

    let result = await client.createDowntime({
      scope: ctx.input.scope,
      monitorIdentifier: {
        monitorId: ctx.input.monitorId,
        monitorTags: ctx.input.monitorTags
      },
      message: ctx.input.message,
      schedule
    });

    let downtime = result.data;

    return {
      output: {
        downtimeId: downtime?.id || 'unknown',
        scope: downtime?.attributes?.scope,
        status: downtime?.attributes?.status,
        message: downtime?.attributes?.message
      },
      message: `Scheduled downtime for scope **${ctx.input.scope}** (ID: ${downtime?.id})`
    };
  })
  .build();
