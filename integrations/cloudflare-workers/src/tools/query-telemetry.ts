import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let queryTelemetry = SlateTool.create(spec, {
  name: 'Query Observability',
  key: 'query_telemetry',
  description: `Run an observability query against Workers telemetry data. Query logs, metrics, and analytics across all Workers in the account within a time range.`,
  instructions: [
    'Timeframe uses Unix timestamps in seconds.',
    'Use listTelemetryKeys first to discover available event keys and types.'
  ]
})
  .input(
    z.object({
      timeframeFrom: z.number().describe('Start of time range as Unix timestamp (seconds)'),
      timeframeTo: z.number().describe('End of time range as Unix timestamp (seconds)'),
      queryId: z.string().optional().describe('Saved query ID to run'),
      filters: z.record(z.string(), z.any()).optional().describe('Additional query filters')
    })
  )
  .output(
    z.object({
      events: z.record(z.string(), z.any()).optional().describe('Queried events'),
      statistics: z
        .record(z.string(), z.any())
        .optional()
        .describe('Query statistics (bytes read, elapsed time, rows read)'),
      calculations: z.array(z.any()).optional().describe('Calculated results'),
      invocations: z.record(z.string(), z.any()).optional().describe('Worker invocation data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let query: Record<string, any> = {
      timeframe: {
        from: ctx.input.timeframeFrom,
        to: ctx.input.timeframeTo
      }
    };
    if (ctx.input.queryId) query.queryId = ctx.input.queryId;
    if (ctx.input.filters) Object.assign(query, ctx.input.filters);

    let result = await client.queryTelemetry(query);

    return {
      output: {
        events: result.events,
        statistics: result.statistics,
        calculations: result.calculations,
        invocations: result.invocations
      },
      message: `Telemetry query completed. ${result.statistics?.rows_read || 0} rows read in ${result.statistics?.elapsed || 0}ms.`
    };
  })
  .build();

export let listTelemetryKeys = SlateTool.create(spec, {
  name: 'List Telemetry Keys',
  key: 'list_telemetry_keys',
  description: `List all available telemetry event keys for Workers observability queries. Use this to discover what data can be queried.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      keys: z
        .array(
          z.object({
            key: z.string().describe('Telemetry key name'),
            type: z.string().optional().describe('Data type of the key'),
            lastSeenAt: z.string().optional().describe('ISO 8601 timestamp when last seen')
          })
        )
        .describe('Available telemetry keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTelemetryKeys();

    let keys = (result || []).map((k: any) => ({
      key: k.key,
      type: k.type,
      lastSeenAt: k.lastSeenAt
    }));

    return {
      output: { keys },
      message: `Found **${keys.length}** telemetry key(s).`
    };
  })
  .build();
