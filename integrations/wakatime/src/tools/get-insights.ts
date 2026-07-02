import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getInsights = SlateTool.create(spec, {
  name: 'Get Insights',
  key: 'get_insights',
  description: `Access deeper analytics about coding activity for a given time range. Available insight types include weekday patterns, daily breakdowns, best day, daily average, and breakdowns by projects, languages, editors, categories, machines, and operating systems.`,
  instructions: [
    'Valid insight types: "weekday", "days", "best_day", "daily_average", "projects", "languages", "editors", "categories", "machines", "operating_systems".',
    'Valid ranges: "last_7_days", "last_30_days", "last_6_months", "last_year", "all_time", or a specific "YYYY" / "YYYY-MM".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      insightType: z
        .string()
        .describe(
          'Type of insight: "weekday", "days", "best_day", "daily_average", "projects", "languages", "editors", "categories", "machines", "operating_systems"'
        ),
      range: z.string().default('last_7_days').describe('Time range for insights'),
      timezone: z.string().optional().describe('Timezone for the insights'),
      weekday: z.number().optional().describe('Filter by weekday (0=Sunday, 6=Saturday)')
    })
  )
  .output(
    z.object({
      insightType: z.string().describe('Type of insight returned'),
      range: z.string().describe('Time range used'),
      insights: z.any().describe('Insight data (structure varies by insight type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result = await client.getInsights(ctx.input.insightType, ctx.input.range, {
      timezone: ctx.input.timezone,
      weekday: ctx.input.weekday
    });

    return {
      output: {
        insightType: ctx.input.insightType,
        range: ctx.input.range,
        insights: result.data || result
      },
      message: `Retrieved **${ctx.input.insightType}** insights for **${ctx.input.range}**.`
    };
  })
  .build();
