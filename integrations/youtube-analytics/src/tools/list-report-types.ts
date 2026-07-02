import { SlateTool } from 'slates';
import { z } from 'zod';
import { YouTubeAnalyticsClient } from '../lib/client';
import { youtubeAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listReportTypes = SlateTool.create(spec, {
  name: 'List Report Types',
  key: 'list_report_types',
  description: `List available YouTube Reporting API report types.
Returns all predefined bulk report types that can be used to create reporting jobs.
Optionally include system-managed report types for content owners.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeAnalyticsActionScopes.listReportTypes)
  .input(
    z.object({
      includeSystemManaged: z
        .boolean()
        .optional()
        .describe('Include system-managed report types (available for content owners).'),
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
      reportTypes: z
        .array(
          z.object({
            reportTypeId: z
              .string()
              .describe('Report type identifier used when creating reporting jobs.'),
            name: z.string().describe('Human-readable name of the report type.')
          })
        )
        .describe('Available report types.'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page of results.'),
      totalReportTypes: z.number().describe('Number of report types returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new YouTubeAnalyticsClient({ token: ctx.auth.token });

    let result = await client.listReportTypes({
      includeSystemManaged: ctx.input.includeSystemManaged,
      onBehalfOfContentOwner: ctx.input.onBehalfOfContentOwner,
      pageToken: ctx.input.pageToken
    });

    return {
      output: {
        reportTypes: result.reportTypes,
        nextPageToken: result.nextPageToken,
        totalReportTypes: result.reportTypes.length
      },
      message: `Found **${result.reportTypes.length}** available report type(s).`
    };
  })
  .build();
