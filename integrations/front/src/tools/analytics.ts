import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAnalyticsExport = SlateTool.create(spec, {
  name: 'Create Analytics Export',
  key: 'create_analytics_export',
  description: `Create a new analytics data export for a specified time range. Exports can be used to extract analytics data for BI tools or data warehouses. The export is processed asynchronously — use the returned export ID to check status.`,
  instructions: [
    'Start and end timestamps should be Unix epoch seconds.',
    'Check the export status using the returned exportId to know when the export is ready for download.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z.number().describe('Start of the time range (Unix epoch seconds)'),
      end: z.number().describe('End of the time range (Unix epoch seconds)'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the export (e.g., America/New_York)'),
      type: z.string().describe('Export type (e.g., messages, conversations, tags)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional filters for the export')
    })
  )
  .output(
    z.object({
      exportId: z.string(),
      status: z.string(),
      progress: z.number(),
      url: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let exportResult = await client.createAnalyticsExport({
      start: ctx.input.start,
      end: ctx.input.end,
      timezone: ctx.input.timezone,
      type: ctx.input.type,
      filters: ctx.input.filters
    });

    return {
      output: {
        exportId: exportResult.id,
        status: exportResult.status,
        progress: exportResult.progress,
        url: exportResult.url
      },
      message: `Analytics export created (ID: ${exportResult.id}, status: ${exportResult.status}).`
    };
  });

export let getAnalyticsExport = SlateTool.create(spec, {
  name: 'Get Analytics Export',
  key: 'get_analytics_export',
  description: `Check the status of an analytics export and get the download URL once it's ready. Exports are processed asynchronously and may take time to complete.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      exportId: z.string().describe('ID of the analytics export to check')
    })
  )
  .output(
    z.object({
      exportId: z.string(),
      status: z.string(),
      progress: z.number(),
      url: z.string().optional(),
      filename: z.string().optional(),
      size: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let exportResult = await client.getAnalyticsExport(ctx.input.exportId);

    return {
      output: {
        exportId: exportResult.id,
        status: exportResult.status,
        progress: exportResult.progress,
        url: exportResult.url,
        filename: exportResult.filename,
        size: exportResult.size
      },
      message: `Analytics export ${exportResult.id}: **${exportResult.status}** (${exportResult.progress}% complete)${exportResult.url ? ` — [Download](${exportResult.url})` : ''}.`
    };
  });

export let createAnalyticsReport = SlateTool.create(spec, {
  name: 'Create Analytics Report',
  key: 'create_analytics_report',
  description: `Create an analytics report for specified metrics over a time range. Reports provide aggregated data on team performance, response times, and conversation metrics.`,
  instructions: [
    'Start and end should be Unix epoch seconds.',
    'Common metrics include: num_conversations, num_messages, avg_first_response_time, avg_resolution_time, etc.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z.number().describe('Start of the time range (Unix epoch seconds)'),
      end: z.number().describe('End of the time range (Unix epoch seconds)'),
      timezone: z.string().optional().describe('Timezone (e.g., America/New_York)'),
      metrics: z.array(z.string()).describe('List of metric identifiers to include'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filters to narrow the report scope')
    })
  )
  .output(
    z.object({
      reportId: z.string(),
      status: z.string(),
      metrics: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let report = await client.createAnalyticsReport({
      start: ctx.input.start,
      end: ctx.input.end,
      timezone: ctx.input.timezone,
      metrics: ctx.input.metrics,
      filters: ctx.input.filters
    });

    return {
      output: {
        reportId: report.id || report._links?.self || 'unknown',
        status: report.status || 'created',
        metrics: report.metrics || report
      },
      message: `Analytics report created with ${ctx.input.metrics.length} metric(s).`
    };
  });
