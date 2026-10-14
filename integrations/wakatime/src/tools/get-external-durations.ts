import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getExternalDurations = SlateTool.create(spec, {
  name: 'Get External Durations',
  key: 'get_external_durations',
  description:
    'Read meetings, calendar events, and other external activity recorded for a day. Includes the external IDs used to update records with create_external_duration.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      date: z.string().describe('Requested day in YYYY-MM-DD format'),
      project: z.string().optional().describe('Filter by project name'),
      branches: z.string().optional().describe('Filter by comma-separated branch names'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the requested day, such as America/New_York')
    })
  )
  .output(
    z.object({
      durations: z.array(
        z.object({
          durationId: z.string(),
          externalId: z.string(),
          entity: z.string(),
          type: z.string(),
          provider: z.string(),
          startTime: z.number(),
          endTime: z.number(),
          project: z.string().optional(),
          branch: z.string().optional(),
          language: z.string().optional(),
          category: z.string().optional(),
          meta: z.string().optional()
        })
      ),
      totalDurations: z.number(),
      start: z.string().optional(),
      end: z.string().optional(),
      timezone: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new WakaTimeClient(ctx.auth).getExternalDurations(ctx.input);
    let durations = result.data.map(duration => ({
      durationId: duration.id,
      externalId: duration.external_id,
      entity: duration.entity,
      type: duration.type,
      provider: duration.provider,
      startTime: duration.start_time,
      endTime: duration.end_time,
      project: duration.project ?? undefined,
      branch: duration.branch ?? undefined,
      language: duration.language ?? undefined,
      category: duration.category ?? undefined,
      meta: duration.meta ?? undefined
    }));
    return {
      output: {
        durations,
        totalDurations: durations.length,
        start: result.start,
        end: result.end,
        timezone: result.timezone
      },
      message: `Retrieved **${durations.length}** external duration(s) for **${ctx.input.date}**.`
    };
  })
  .build();
