import { SlateTool } from 'slates';
import { z } from 'zod';
import { YouTubeAnalyticsClient } from '../lib/client';
import { youtubeAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listBulkReports = SlateTool.create(spec, {
  name: 'List Bulk Reports',
  key: 'list_bulk_reports',
  description: `List available bulk reports for a YouTube Reporting API job.
Each report covers a unique 24-hour period of data. Use optional filters to narrow results by creation time or data period.
Returns report metadata including download URLs for retrieving the report content.`,
  instructions: [
    'jobId is required — use "Manage Reporting Jobs" to find your job IDs.',
    'Timestamps must be in RFC 3339 UTC format, e.g. "2024-01-15T00:00:00Z".'
  ],
  constraints: ['Reports are available for 60 days after generation.'],
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeAnalyticsActionScopes.listBulkReports)
  .input(
    z.object({
      jobId: z.string().describe('ID of the reporting job to list reports for.'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only include reports created after this timestamp (RFC 3339 UTC format).'),
      startTimeAtOrAfter: z
        .string()
        .optional()
        .describe('Only include reports with data starting at or after this timestamp.'),
      startTimeBefore: z
        .string()
        .optional()
        .describe('Only include reports with data starting before this timestamp.'),
      onBehalfOfContentOwner: z
        .string()
        .optional()
        .describe('Content owner ID for content owner operations.'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token for fetching next page of results.')
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportId: z.string().describe('Report ID.'),
            jobId: z.string().describe('Job ID.'),
            startTime: z.string().describe('Start of the reporting period.'),
            endTime: z.string().describe('End of the reporting period.'),
            createTime: z.string().describe('When the report was generated.'),
            downloadUrl: z.string().describe('URL to download the report data.')
          })
        )
        .describe('List of available bulk reports.'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results.'),
      totalReports: z.number().describe('Number of reports returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new YouTubeAnalyticsClient({ token: ctx.auth.token });

    let result = await client.listBulkReports(ctx.input.jobId, {
      createdAfter: ctx.input.createdAfter,
      startTimeAtOrAfter: ctx.input.startTimeAtOrAfter,
      startTimeBefore: ctx.input.startTimeBefore,
      onBehalfOfContentOwner: ctx.input.onBehalfOfContentOwner,
      pageToken: ctx.input.pageToken
    });

    let reports = result.reports.map(r => ({
      reportId: r.reportId,
      jobId: r.jobId,
      startTime: r.startTime,
      endTime: r.endTime,
      createTime: r.createTime,
      downloadUrl: r.downloadUrl
    }));

    return {
      output: {
        reports,
        nextPageToken: result.nextPageToken,
        totalReports: reports.length
      },
      message: `Found **${reports.length}** bulk report(s) for job **${ctx.input.jobId}**.`
    };
  })
  .build();
