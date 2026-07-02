import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClickCounters = SlateTool.create(spec, {
  name: 'Get Click Counters',
  key: 'get_click_counters',
  description: `Retrieves click counts grouped by a specific dimension such as country, platform, browser, referrer, ISP, link, or top query parameters. Useful for understanding traffic distribution.`,
  instructions: [
    'Choose a counter dimension to group click counts by.',
    'Optionally filter by link, date range, country, or bot inclusion.'
  ],
  constraints: ['Rate limited — may return 429 errors on excessive use.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      counter: z
        .enum(['country', 'platform', 'browser', 'referer', 'isp', 'link_id', 'top_params'])
        .describe('Dimension to group clicks by'),
      linkId: z.number().optional().describe('Filter by a single link ID'),
      linkIds: z.string().optional().describe('Filter by multiple link IDs (comma-separated)'),
      start: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date (YYYY-MM-DD)'),
      country: z.string().optional().describe('Filter by country (ISO 3166-1 alpha-2 code)'),
      bots: z.boolean().optional().describe('Include bot traffic'),
      unique: z.boolean().optional().describe('Count only unique visitors')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total click count across all values'),
      counters: z
        .array(
          z.object({
            name: z.string().describe('Dimension value (e.g., country code, browser name)'),
            count: z.number().describe('Click count for this value')
          })
        )
        .describe('Click counts grouped by dimension')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.getClickCounters(ctx.input);

    let counters: Array<{ name: string; count: number }> = [];
    if (Array.isArray(result.values)) {
      counters = result.values.map((v: any) => ({
        name: v.value || v.name || String(v),
        count: v.count || 0
      }));
    } else if (Array.isArray(result)) {
      counters = result.map((v: any) => ({
        name: v.value || v.name || String(v),
        count: v.count || 0
      }));
    }

    return {
      output: {
        total: result.total,
        counters
      },
      message: `Retrieved **${counters.length}** ${ctx.input.counter} breakdown entries${result.total !== undefined ? ` (${result.total} total clicks)` : ''}`
    };
  })
  .build();
