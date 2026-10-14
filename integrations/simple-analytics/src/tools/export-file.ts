import { SlateTool } from 'slates';
import { z } from 'zod';
import { getExportDownloadDetails } from '../lib/export';
import { spec } from '../spec';

export let exportFileTool = SlateTool.create(spec, {
  name: 'Export Analytics File',
  key: 'export_analytics_file',
  description:
    'Prepare a downloadable CSV or JSON file of raw page views and events, including selected custom metadata fields. Requires both API key and User-Id authentication.',
  instructions: [
    'Choose exact field names from the Export API or the dashboard export interface. Metadata fields include their storage type suffix, such as metadata.project_text.',
    'The session_id field remains available and identifies a single page load.',
    'Hourly exports require YYYY-MM-DDTHH for both dates within the same day.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      start: z
        .string()
        .describe(
          'Start date string, such as YYYY-MM-DD or today-30d. Absolute hourly format is YYYY-MM-DDTHH.'
        ),
      end: z
        .string()
        .describe(
          'End date string, such as YYYY-MM-DD, today, or yesterday. Absolute hourly format is YYYY-MM-DDTHH.'
        ),
      fields: z
        .array(z.string())
        .describe(
          'Export field names, for example added_iso, path, document_referrer, scrolled_percentage, session_id, and metadata.project_text.'
        ),
      format: z.enum(['csv', 'json']).optional().describe('File format. Defaults to CSV.'),
      type: z
        .enum(['pageviews', 'events'])
        .optional()
        .describe('Optional data point type filter.'),
      timezone: z.string().optional().describe('IANA timezone. Defaults to UTC.'),
      includeRobots: z
        .boolean()
        .optional()
        .describe('Include robot traffic. Defaults to false.')
    })
  )
  .output(
    z.object({
      hostname: z.string(),
      start: z.string(),
      end: z.string(),
      format: z.enum(['csv', 'json']),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let format = ctx.input.format ?? 'csv';
    let mimeType = format === 'csv' ? 'text/csv' : 'application/json';
    await ctx.addAttachment({
      type: 'url',
      ...getExportDownloadDetails(ctx.auth, {
        hostname: ctx.config.hostname,
        start: ctx.input.start,
        end: ctx.input.end,
        fields: ctx.input.fields,
        format,
        type: ctx.input.type,
        timezone: ctx.input.timezone,
        robots: ctx.input.includeRobots
      }),
      mimeType
    });

    return {
      output: {
        hostname: ctx.config.hostname,
        start: ctx.input.start,
        end: ctx.input.end,
        format,
        mimeType
      },
      message: `Prepared a downloadable ${format.toUpperCase()} export for **${ctx.config.hostname}** from ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();
