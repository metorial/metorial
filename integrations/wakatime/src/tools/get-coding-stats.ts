import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let breakdownItemSchema = z
  .object({
    name: z.string().describe('Name of the item'),
    totalSeconds: z.number().describe('Total seconds spent'),
    percent: z.number().describe('Percentage of total time'),
    text: z.string().describe('Human-readable time')
  })
  .passthrough();

export let getCodingStats = SlateTool.create(spec, {
  name: 'Get Coding Stats',
  key: 'get_coding_stats',
  description: `Retrieve aggregated coding statistics for a configurable time range. Includes breakdowns by project, language, editor, OS, category, and more, plus best day and daily average. Stats may be computed asynchronously — check the **isUpToDate** flag.`,
  instructions: [
    'Valid ranges: "last_7_days", "last_30_days", "last_6_months", "last_year", "all_time", or a specific year "YYYY" or month "YYYY-MM".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      range: z
        .string()
        .default('last_7_days')
        .describe(
          'Time range: "last_7_days", "last_30_days", "last_6_months", "last_year", "all_time", or "YYYY" / "YYYY-MM"'
        ),
      project: z.string().optional().describe('Filter by project name'),
      timezone: z.string().optional().describe('Timezone for the stats')
    })
  )
  .output(
    z.object({
      isUpToDate: z.boolean().describe('Whether stats have finished computing'),
      totalSeconds: z.number().describe('Total coding time in seconds'),
      totalSecondsText: z.string().describe('Human-readable total time'),
      dailyAverage: z.number().describe('Daily average in seconds'),
      dailyAverageText: z.string().describe('Human-readable daily average'),
      bestDay: z
        .object({
          date: z.string().describe('Date of the best day'),
          totalSeconds: z.number().describe('Total seconds on best day'),
          text: z.string().describe('Human-readable best day time')
        })
        .optional()
        .describe('Day with the most coding activity'),
      projects: z.array(breakdownItemSchema).describe('Time by project'),
      languages: z.array(breakdownItemSchema).describe('Time by language'),
      editors: z.array(breakdownItemSchema).describe('Time by editor'),
      operatingSystems: z.array(breakdownItemSchema).describe('Time by OS'),
      categories: z.array(breakdownItemSchema).describe('Time by category'),
      range: z.string().describe('The time range used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let stats = await client.getStats(ctx.input.range, {
      project: ctx.input.project,
      timezone: ctx.input.timezone
    });

    let mapItems = (items: any[]) =>
      (items || []).map((i: any) => ({
        name: i.name ?? '',
        totalSeconds: i.total_seconds ?? 0,
        percent: i.percent ?? 0,
        text: i.text ?? '0 secs'
      }));

    let bestDay = stats.best_day
      ? {
          date: stats.best_day.date ?? '',
          totalSeconds: stats.best_day.total_seconds ?? 0,
          text: stats.best_day.text ?? '0 secs'
        }
      : undefined;

    return {
      output: {
        isUpToDate: stats.is_up_to_date ?? false,
        totalSeconds: stats.total_seconds ?? 0,
        totalSecondsText: stats.human_readable_total ?? '0 secs',
        dailyAverage: stats.daily_average ?? 0,
        dailyAverageText: stats.human_readable_daily_average ?? '0 secs',
        bestDay,
        projects: mapItems(stats.projects),
        languages: mapItems(stats.languages),
        editors: mapItems(stats.editors),
        operatingSystems: mapItems(stats.operating_systems),
        categories: mapItems(stats.categories),
        range: ctx.input.range
      },
      message: `Coding stats for **${ctx.input.range}**: **${stats.human_readable_total ?? '0 secs'}** total, **${stats.human_readable_daily_average ?? '0 secs'}** daily average.${bestDay ? ` Best day: **${bestDay.date}** (${bestDay.text}).` : ''}`
    };
  })
  .build();
