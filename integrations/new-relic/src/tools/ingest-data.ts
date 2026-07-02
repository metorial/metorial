import { SlateTool } from 'slates';
import { z } from 'zod';
import { IngestClient } from '../lib/client';
import { spec } from '../spec';

export let ingestData = SlateTool.create(spec, {
  name: 'Ingest Data',
  key: 'ingest_data',
  description: `Send custom telemetry data to New Relic. Supports ingesting **metrics**, **events**, **logs**, and **traces** via the respective ingest APIs.
Requires a License Key to be configured in authentication.`,
  instructions: [
    'Choose a `dataType` and provide the corresponding data array.',
    'Metrics require `name`, `type` (gauge, count, summary), and `value`.',
    'Events require an `eventType` field and arbitrary key-value attributes.',
    'Logs require a `message` field.',
    'Traces require `traceId`, `spanId`, `serviceName`, `name`, and `durationMs`.'
  ],
  constraints: [
    'Requires a License Key (ingest key) to be configured.',
    'Maximum payload size depends on data type but generally up to 1MB per request.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dataType: z
        .enum(['metrics', 'events', 'logs', 'traces'])
        .describe('Type of telemetry data to ingest'),
      metrics: z
        .array(
          z.object({
            name: z.string().describe('Metric name'),
            type: z.enum(['gauge', 'count', 'summary']).describe('Metric type'),
            value: z.number().describe('Metric value'),
            timestamp: z.number().optional().describe('Unix timestamp in seconds'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Additional metric attributes')
          })
        )
        .optional()
        .describe('Metric data points (required when dataType is "metrics")'),
      events: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Event objects, each must include an "eventType" field (required when dataType is "events")'
        ),
      logs: z
        .array(
          z.object({
            message: z.string().describe('Log message'),
            timestamp: z.number().optional().describe('Unix timestamp in milliseconds'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Additional log attributes')
          })
        )
        .optional()
        .describe('Log entries (required when dataType is "logs")'),
      traces: z
        .array(
          z.object({
            traceId: z.string().describe('Trace ID linking related spans'),
            spanId: z.string().describe('Unique span ID'),
            parentId: z.string().optional().describe('Parent span ID'),
            serviceName: z.string().describe('Name of the service'),
            name: z.string().describe('Span/operation name'),
            durationMs: z.number().describe('Span duration in milliseconds'),
            timestamp: z.number().optional().describe('Unix timestamp in milliseconds'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Additional span attributes')
          })
        )
        .optional()
        .describe('Trace spans (required when dataType is "traces")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the data was accepted'),
      requestId: z.string().optional().describe('Request ID returned by New Relic'),
      itemCount: z.number().describe('Number of data items sent')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.licenseKey) {
      throw new Error(
        'License Key is required for data ingestion. Please configure it in authentication settings.'
      );
    }

    let ingestClient = new IngestClient({
      region: ctx.config.region,
      accountId: ctx.config.accountId,
      licenseKey: ctx.auth.licenseKey
    });

    let { dataType } = ctx.input;

    if (dataType === 'metrics') {
      if (!ctx.input.metrics?.length)
        throw new Error('metrics array is required when dataType is "metrics"');
      ctx.progress(`Ingesting ${ctx.input.metrics.length} metric(s)...`);
      let result = await ingestClient.ingestMetrics(ctx.input.metrics);
      return {
        output: {
          success: true,
          requestId: result?.requestId,
          itemCount: ctx.input.metrics.length
        },
        message: `Successfully ingested **${ctx.input.metrics.length}** metric(s).`
      };
    }

    if (dataType === 'events') {
      if (!ctx.input.events?.length)
        throw new Error('events array is required when dataType is "events"');
      ctx.progress(`Ingesting ${ctx.input.events.length} event(s)...`);
      let result = await ingestClient.ingestEvents(ctx.input.events);
      return {
        output: {
          success: true,
          requestId: result?.requestId,
          itemCount: ctx.input.events.length
        },
        message: `Successfully ingested **${ctx.input.events.length}** event(s).`
      };
    }

    if (dataType === 'logs') {
      if (!ctx.input.logs?.length)
        throw new Error('logs array is required when dataType is "logs"');
      ctx.progress(`Ingesting ${ctx.input.logs.length} log(s)...`);
      let result = await ingestClient.ingestLogs(ctx.input.logs);
      return {
        output: {
          success: true,
          requestId: result?.requestId,
          itemCount: ctx.input.logs.length
        },
        message: `Successfully ingested **${ctx.input.logs.length}** log(s).`
      };
    }

    // traces
    if (!ctx.input.traces?.length)
      throw new Error('traces array is required when dataType is "traces"');
    ctx.progress(`Ingesting ${ctx.input.traces.length} span(s)...`);
    let result = await ingestClient.ingestTraces(ctx.input.traces);
    return {
      output: {
        success: true,
        requestId: result?.requestId,
        itemCount: ctx.input.traces.length
      },
      message: `Successfully ingested **${ctx.input.traces.length}** trace span(s).`
    };
  })
  .build();
