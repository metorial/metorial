import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

let reportSchema = z.object({
  reportId: z.string().describe('Unique identifier of the report'),
  reportType: z
    .string()
    .describe('Type of report (image_analytics, source_analytics, cdn_logs, mild_errors)'),
  reportKey: z.string().optional().describe('Human-readable identifier for the report'),
  completed: z.boolean().describe('Whether the report has been finalized'),
  periodStart: z.number().optional().describe('Unix timestamp of the reporting period start'),
  periodEnd: z.number().optional().describe('Unix timestamp of the reporting period end'),
  files: z.array(z.string()).optional().describe('Download URLs for the report data files')
});

export let getReports = SlateTool.create(spec, {
  name: 'Get Reports',
  key: 'get_reports',
  description: `Retrieve analytics reports from Imgix. Reports are updated daily and retained for 90 days. Available report types include **image_analytics** (per-image metrics), **source_analytics** (per-source metrics), **cdn_logs** (CDN request logs), and **mild_errors** (4xx error data). You can list reports with filters or fetch a specific report by ID.`,
  constraints: [
    'Reports are finalized at 00:00 UTC and available by 04:00 UTC.',
    'Image analytics is available to all paid customers; other report types require Premium plans.',
    'Report data files are limited to 64MB each.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z
        .string()
        .optional()
        .describe('Specific report ID to retrieve. If provided, returns a single report.'),
      reportType: z
        .enum(['image_analytics', 'source_analytics', 'cdn_logs', 'mild_errors'])
        .optional()
        .describe('Filter by report type when listing'),
      completed: z.boolean().optional().describe('Filter by completion status when listing'),
      sort: z
        .enum([
          'period_end',
          '-period_end',
          'period_start',
          '-period_start',
          'report_key',
          '-report_key',
          'report_type',
          '-report_type'
        ])
        .optional()
        .describe('Sort field and direction')
    })
  )
  .output(
    z.object({
      reports: z
        .array(reportSchema)
        .describe('List of reports (single item when fetching by ID)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    if (ctx.input.reportId) {
      let result = await client.getReport(ctx.input.reportId);
      let r = result.data;
      return {
        output: {
          reports: [
            {
              reportId: r.id,
              reportType: r.attributes?.report_type ?? '',
              reportKey: r.attributes?.report_key,
              completed: r.attributes?.completed ?? false,
              periodStart: r.attributes?.period_start,
              periodEnd: r.attributes?.period_end,
              files: r.attributes?.files
            }
          ]
        },
        message: `Retrieved report **${r.id}** (${r.attributes?.report_type}).`
      };
    }

    let result = await client.listReports({
      sort: ctx.input.sort,
      filterReportType: ctx.input.reportType,
      filterCompleted: ctx.input.completed
    });

    let reports = (result.data || []).map((r: any) => ({
      reportId: r.id,
      reportType: r.attributes?.report_type ?? '',
      reportKey: r.attributes?.report_key,
      completed: r.attributes?.completed ?? false,
      periodStart: r.attributes?.period_start,
      periodEnd: r.attributes?.period_end,
      files: r.attributes?.files
    }));

    return {
      output: { reports },
      message: `Found **${reports.length}** report(s).`
    };
  })
  .build();
