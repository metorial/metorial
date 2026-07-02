import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  attribute: z
    .string()
    .describe('Mailgun filter attribute, such as domain, tag, or recipient'),
  comparator: z
    .string()
    .describe('Filter comparator supported by Mailgun, such as =, !=, contains'),
  values: z
    .array(
      z.object({
        value: z.string().describe('Filter value'),
        label: z.string().optional().describe('Optional display label')
      })
    )
    .optional()
    .describe('Values to compare against')
});

let metricDimensionSchema = z.object({
  dimension: z.string().optional().describe('Dimension name'),
  value: z.string().optional().describe('Dimension value'),
  displayValue: z.string().optional().describe('Display value returned by Mailgun')
});

let logsPaginationSchema = z.object({
  sort: z
    .string()
    .optional()
    .describe('Sort order, such as "timestamp:desc" or "timestamp:asc"'),
  token: z.string().optional().describe('Page token from a previous logs response'),
  limit: z.number().optional().describe('Maximum logs to return, up to 100')
});

export let queryMetrics = SlateTool.create(spec, {
  name: 'Query Metrics',
  key: 'query_metrics',
  description: `Query Mailgun's current Metrics API for account or domain analytics. Use this for current reporting instead of the legacy Stats API when you need flexible dimensions, filters, rates, and aggregate metrics.`,
  instructions: [
    'Use filters with attribute "domain" to scope metrics to a single sending domain.',
    'Use dimensions like "time", "domain", "tag", "recipient_provider", or "recipient_domain" to group results.',
    'Use duration for relative windows such as "7d"; if duration is provided, Mailgun calculates start from end.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date in RFC 2822 format'),
      end: z.string().optional().describe('End date in RFC 2822 format'),
      resolution: z
        .enum(['hour', 'day', 'month'])
        .optional()
        .describe('Time resolution for time dimensions'),
      duration: z.string().optional().describe('Relative duration, such as "1d" or "7d"'),
      dimensions: z
        .array(
          z.enum([
            'bot',
            'country',
            'ip_pool',
            'recipient_domain',
            'recipient_provider',
            'ip',
            'domain',
            'tag',
            'device',
            'subaccount',
            'time'
          ])
        )
        .optional()
        .describe('Dimensions to group metrics by'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Metric names to return, such as delivered_count or clicked_rate'),
      filters: z.array(filterSchema).optional().describe('AND filters to apply'),
      includeSubaccounts: z.boolean().optional().describe('Include subaccount metrics'),
      includeAggregates: z.boolean().optional().describe('Include top-level aggregates')
    })
  )
  .output(
    z.object({
      start: z.string().optional().describe('Start of the metrics window'),
      end: z.string().optional().describe('End of the metrics window'),
      resolution: z.string().optional().describe('Resolution used by Mailgun'),
      duration: z.string().optional().describe('Duration used by Mailgun'),
      items: z.array(
        z.object({
          dimensions: z.array(metricDimensionSchema).optional(),
          metrics: z.record(z.string(), z.unknown()).optional()
        })
      ),
      aggregates: z.record(z.string(), z.unknown()).optional(),
      pagination: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.queryMetrics({
      start: ctx.input.start,
      end: ctx.input.end,
      resolution: ctx.input.resolution,
      duration: ctx.input.duration,
      dimensions: ctx.input.dimensions,
      metrics: ctx.input.metrics,
      filters: ctx.input.filters,
      includeSubaccounts: ctx.input.includeSubaccounts,
      includeAggregates: ctx.input.includeAggregates
    });

    let items = (result.items || []).map(item => ({
      dimensions: item.dimensions?.map(dimension => ({
        dimension: dimension.dimension,
        value: dimension.value,
        displayValue: dimension.display_value
      })),
      metrics: item.metrics
    }));

    return {
      output: {
        start: result.start,
        end: result.end,
        resolution: result.resolution,
        duration: result.duration,
        items,
        aggregates: result.aggregates,
        pagination: result.pagination
      },
      message: `Retrieved **${items.length}** Mailgun metric item(s).`
    };
  })
  .build();

export let queryLogs = SlateTool.create(spec, {
  name: 'Query Logs',
  key: 'query_logs',
  description: `Query Mailgun's current Logs API for account event logs. Use this for current delivery/debug logging instead of the legacy Events API when you need pagination, totals, or richer log records.`,
  instructions: [
    'duration is required by Mailgun and defaults to "1d".',
    'Use filters with attributes like domain, recipient, or tag to narrow results.',
    'Use pagination.token from a previous response to fetch another page.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date in RFC 2822 format'),
      end: z.string().optional().describe('End date in RFC 2822 format'),
      duration: z.string().default('1d').describe('Relative duration, such as "1d" or "2h"'),
      events: z
        .array(
          z.enum([
            'accepted',
            'delivered',
            'failed',
            'opened',
            'unique_opened',
            'clicked',
            'unique_clicked',
            'unsubscribed',
            'complained',
            'rejected',
            'stored',
            'email_validation',
            'list_uploaded',
            'list_member_uploaded',
            'list_member_upload_error',
            'trapped'
          ])
        )
        .optional()
        .describe('Event types to include'),
      metricEvents: z
        .array(z.string())
        .optional()
        .describe('Analytics metric events to convert into log event filters'),
      filters: z.array(filterSchema).optional().describe('AND filters to apply'),
      includeSubaccounts: z.boolean().optional().describe('Include subaccount logs'),
      includeTotals: z.boolean().optional().describe('Include total log count'),
      pagination: logsPaginationSchema.optional().describe('Logs pagination options')
    })
  )
  .output(
    z.object({
      start: z.string().describe('Start of the logs window'),
      end: z.string().describe('End of the logs window'),
      logs: z.array(z.record(z.string(), z.unknown())).describe('Log records from Mailgun'),
      pagination: z.record(z.string(), z.unknown()).describe('Mailgun pagination metadata'),
      aggregates: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.queryLogs({
      start: ctx.input.start,
      end: ctx.input.end,
      duration: ctx.input.duration,
      events: ctx.input.events,
      metricEvents: ctx.input.metricEvents,
      filters: ctx.input.filters,
      includeSubaccounts: ctx.input.includeSubaccounts,
      includeTotals: ctx.input.includeTotals,
      pagination: ctx.input.pagination
    });

    return {
      output: {
        start: result.start,
        end: result.end,
        logs: result.items || [],
        pagination: result.pagination,
        aggregates: result.aggregates
      },
      message: `Retrieved **${(result.items || []).length}** Mailgun log record(s).`
    };
  })
  .build();
