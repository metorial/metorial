import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { anthropicServiceError } from '../lib/errors';
import { spec } from '../spec';

let usageGroupBySchema = z.enum([
  'api_key_id',
  'workspace_id',
  'model',
  'service_tier',
  'context_window',
  'description'
]);

let costGroupBy = new Set(['workspace_id', 'description']);
let messagesUsageGroupBy = new Set([
  'api_key_id',
  'workspace_id',
  'model',
  'service_tier',
  'context_window'
]);

let ensureValidGroupBy = (reportType: 'messages_usage' | 'cost', groupBy?: string[]) => {
  let allowed = reportType === 'cost' ? costGroupBy : messagesUsageGroupBy;
  let invalid = (groupBy ?? []).filter(group => !allowed.has(group));
  if (invalid.length > 0) {
    throw anthropicServiceError(
      `${invalid.join(', ')} cannot be used as groupBy for "${reportType}"`
    );
  }
};

export let getUsageReport = SlateTool.create(spec, {
  name: 'Get Usage Report',
  key: 'get_usage_report',
  description: `Retrieve Anthropic Admin API usage and cost reports for an organization. Use message usage reports for token and server-tool usage, and cost reports for USD spend attribution.`,
  instructions: [
    'Requires an Admin API key (sk-ant-admin...).',
    'startingAt and endingAt must be RFC 3339 timestamps; buckets are snapped to UTC boundaries by Anthropic.',
    'For messages_usage, groupBy supports api_key_id, workspace_id, model, service_tier, and context_window.',
    'For cost, groupBy supports workspace_id and description.'
  ],
  constraints: ['Requires an Admin API key (sk-ant-admin...).'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z.enum(['messages_usage', 'cost']).describe('Report endpoint to query'),
      startingAt: z
        .string()
        .describe('RFC 3339 timestamp; buckets starting on or after this time are returned'),
      endingAt: z
        .string()
        .optional()
        .describe('RFC 3339 timestamp; buckets ending before this time are returned'),
      bucketWidth: z
        .enum(['1m', '1h', '1d'])
        .optional()
        .describe('Bucket width for messages_usage reports'),
      groupBy: z
        .array(usageGroupBySchema)
        .optional()
        .describe('Dimensions to group report rows by'),
      apiKeyIds: z
        .array(z.string())
        .optional()
        .describe('Filter messages_usage by API key IDs'),
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Filter messages_usage by workspace IDs'),
      models: z.array(z.string()).optional().describe('Filter messages_usage by model IDs'),
      serviceTiers: z
        .array(z.enum(['standard', 'batch', 'priority']))
        .optional()
        .describe('Filter messages_usage by service tiers'),
      contextWindows: z
        .array(z.enum(['0-200k', '200k-1M']))
        .optional()
        .describe('Filter messages_usage by context window'),
      limit: z.number().optional().describe('Maximum number of time buckets to return'),
      page: z.string().optional().describe('Pagination token returned as nextPage')
    })
  )
  .output(
    z.object({
      data: z.array(z.record(z.string(), z.unknown())).describe('Report buckets'),
      hasMore: z.boolean().describe('Whether more report data is available'),
      nextPage: z.string().optional().describe('Pagination token for a follow-up request')
    })
  )
  .handleInvocation(async ctx => {
    ensureValidGroupBy(ctx.input.reportType, ctx.input.groupBy);

    if (ctx.input.reportType === 'cost' && ctx.input.bucketWidth !== undefined) {
      throw anthropicServiceError('bucketWidth is only supported for messages_usage reports');
    }

    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result =
      ctx.input.reportType === 'messages_usage'
        ? await client.getMessagesUsageReport({
            startingAt: ctx.input.startingAt,
            endingAt: ctx.input.endingAt,
            bucketWidth: ctx.input.bucketWidth,
            groupBy: ctx.input.groupBy,
            apiKeyIds: ctx.input.apiKeyIds,
            workspaceIds: ctx.input.workspaceIds,
            models: ctx.input.models,
            serviceTiers: ctx.input.serviceTiers,
            contextWindows: ctx.input.contextWindows,
            limit: ctx.input.limit,
            page: ctx.input.page
          })
        : await client.getCostReport({
            startingAt: ctx.input.startingAt,
            endingAt: ctx.input.endingAt,
            groupBy: ctx.input.groupBy,
            limit: ctx.input.limit,
            page: ctx.input.page
          });

    return {
      output: {
        data: result.data,
        hasMore: result.hasMore,
        nextPage: result.nextPage ?? undefined
      },
      message: `Retrieved **${result.data.length}** ${ctx.input.reportType} report bucket(s).${result.hasMore ? ' More data is available with nextPage.' : ''}`
    };
  })
  .build();
