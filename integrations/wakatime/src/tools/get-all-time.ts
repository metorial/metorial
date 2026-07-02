import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getAllTime = SlateTool.create(spec, {
  name: 'Get All Time',
  key: 'get_all_time',
  description: `Retrieve the total coding time since the user's account was created. Optionally filter by a specific project to see all-time totals for that project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Filter by project name to get all-time total for a specific project')
    })
  )
  .output(
    z.object({
      totalSeconds: z.number().describe('Total coding time in seconds since account creation'),
      text: z.string().describe('Human-readable total time'),
      isUpToDate: z.boolean().describe('Whether the total is up to date'),
      range: z
        .object({
          startDate: z.string().optional().describe('Start date of tracking'),
          startText: z.string().optional().describe('Human-readable start date'),
          endDate: z.string().optional().describe('End date'),
          endText: z.string().optional().describe('Human-readable end date'),
          timezone: z.string().optional().describe('Timezone')
        })
        .passthrough()
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result = await client.getAllTimeSinceToday(ctx.input.project);

    return {
      output: {
        totalSeconds: result.total_seconds ?? 0,
        text: result.text ?? '0 secs',
        isUpToDate: result.is_up_to_date ?? false,
        range: result.range
          ? {
              startDate: result.range.start_date,
              startText: result.range.start_text,
              endDate: result.range.end_date,
              endText: result.range.end_text,
              timezone: result.range.timezone
            }
          : undefined
      },
      message: `All-time coding total${ctx.input.project ? ` for **${ctx.input.project}**` : ''}: **${result.text ?? '0 secs'}**.`
    };
  })
  .build();
