import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageOutputSchema, reportOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieves a GTmetrix page by ID, including its metadata and optionally its latest report or historical reports list. A page groups all reports that share the same URL and analysis options.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('The page ID to retrieve'),
      includeLatestReport: z
        .boolean()
        .optional()
        .describe('If true, fetches and includes the latest report for this page'),
      includeReports: z
        .boolean()
        .optional()
        .describe(
          'If true, fetches and includes the list of historical reports for this page'
        ),
      reportsPageSize: z
        .number()
        .optional()
        .describe(
          'Number of reports to return when includeReports is true (1-500, default 50)'
        ),
      reportsPageNumber: z.number().optional().describe('Page number for reports pagination')
    })
  )
  .output(
    z.object({
      page: pageOutputSchema,
      latestReport: reportOutputSchema
        .optional()
        .describe('The latest report for this page, if requested'),
      reports: z
        .array(reportOutputSchema)
        .optional()
        .describe('Historical reports for this page, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let page = await client.getPage(ctx.input.pageId);

    let latestReport: any;
    if (ctx.input.includeLatestReport) {
      try {
        latestReport = await client.getPageLatestReport(ctx.input.pageId);
      } catch (e) {
        ctx.warn(
          `Could not fetch latest report: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    let reports: any;
    if (ctx.input.includeReports) {
      let result = await client.listPageReports(ctx.input.pageId, {
        pageSize: ctx.input.reportsPageSize,
        pageNumber: ctx.input.reportsPageNumber
      });
      reports = result.items;
    }

    let msg = `Page **${page.url}** — ${page.reportCount} report(s), monitored: ${page.monitored}`;
    if (latestReport) {
      msg += `\n\nLatest report: Grade **${latestReport.gtmetrixGrade ?? 'N/A'}**, Performance **${latestReport.performanceScore ?? 'N/A'}**`;
    }
    if (reports) {
      msg += `\n\nIncluded **${reports.length}** historical report(s).`;
    }

    return {
      output: { page, latestReport, reports },
      message: msg
    };
  })
  .build();
