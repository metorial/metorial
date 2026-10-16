import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportClickAnalytics = SlateTool.create(spec, {
  name: 'Export Click Analytics',
  key: 'export_click_analytics',
  description:
    'Prepares downloadable click analytics as CSV or TSV, with optional date, link, traffic, timezone, and pivot filters.',
  instructions: ['Use pivot="link_id" for a matrix with dates as rows and links as columns.'],
  constraints: ['Downloading the export consumes the workspace analytics API allowance.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      format: z.enum(['csv', 'tsv']).describe('Download file format'),
      linkId: z.number().optional().describe('Filter by a single link ID'),
      linkIds: z
        .string()
        .optional()
        .describe('Filter by multiple link IDs, separated by commas or hyphens'),
      start: z
        .string()
        .optional()
        .describe('Start date or timestamp (YYYY-MM-DD or ISO 8601)'),
      end: z.string().optional().describe('End date or timestamp (YYYY-MM-DD or ISO 8601)'),
      country: z.string().optional().describe('Country filter as an ISO 3166-1 alpha-2 code'),
      browser: z.string().optional().describe('Browser name filter'),
      platform: z.string().optional().describe('Platform or operating system filter'),
      referer: z.string().optional().describe('Referrer domain filter'),
      isp: z.string().optional().describe('Internet service provider filter'),
      bots: z.boolean().optional().describe('Whether to include bot traffic'),
      unique: z.boolean().optional().describe('Count unique clicks only'),
      pivot: z.enum(['link_id']).optional().describe('Compare links in a matrix'),
      timezone: z.string().optional().describe('IANA timezone used for date grouping'),
      frequency: z.enum(['day', 'hour']).optional().describe('Time granularity')
    })
  )
  .output(
    z.object({
      filename: z.string().describe('Download filename'),
      mimeType: z.string().describe('Download content type'),
      format: z.enum(['csv', 'tsv']).describe('Export format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let download = client.getAnalyticsDownload(ctx.input);
    let filename = `linkly-click-analytics.${ctx.input.format}`;
    let mimeType = ctx.input.format === 'csv' ? 'text/csv' : 'text/tab-separated-values';
    await ctx.addAttachment({
      type: 'url',
      ...download,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      filename,
      mimeType
    });
    return {
      output: { filename, mimeType, format: ctx.input.format },
      message: `Prepared **${filename}** for download.`
    };
  })
  .build();
