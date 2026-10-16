import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
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
      linkIds: z
        .string()
        .optional()
        .describe('Filter by multiple link IDs (comma- or hyphen-separated)'),
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
            count: z.number().describe('Click count for this value'),
            key: z
              .string()
              .optional()
              .describe('Query parameter name when grouping by top_params'),
            linkId: z.number().optional().describe('Link ID when grouping by link_id'),
            link: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Complete link record when grouping by link_id')
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

    let values = Array.isArray(result.values)
      ? result.values
      : Array.isArray(result)
        ? result
        : [];
    let counters = values.map(
      (item: { value?: unknown; name?: string; key?: string; count?: number }) => {
        if (typeof item.count !== 'number' || !Number.isFinite(item.count)) {
          throw createApiServiceError(
            'Linkly returned a click counter without a valid numeric count. Retry the request or check the provider response.',
            { reason: 'linkly_invalid_response' }
          );
        }
        let link =
          ctx.input.counter === 'link_id' && isApiErrorRecord(item.value)
            ? item.value
            : undefined;
        return {
          name: link
            ? String(link.full_url ?? link.name ?? link.id ?? link.url ?? '')
            : String(item.value ?? item.name ?? ''),
          count: item.count,
          key: item.key,
          linkId: typeof link?.id === 'number' ? link.id : undefined,
          link
        };
      }
    );

    return {
      output: {
        total: result.total,
        counters
      },
      message: `Retrieved **${counters.length}** ${ctx.input.counter} breakdown entries${result.total !== undefined ? ` (${result.total} total clicks)` : ''}`
    };
  })
  .build();
