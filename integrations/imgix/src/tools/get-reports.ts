import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { mapReport, pageNumber, pageSize, pagination, reportOutput } from '../lib/schemas';
import { spec } from '../spec';
export const getReports = SlateTool.create(spec, {
  name: 'Get Reports',
  key: 'get_reports',
  description:
    'List one native report page or read an exact report. Reports are updated daily and retained for 90 days. Optionally provide all report data files for download when reading a completed report.',
  constraints: [
    'Analytics permission is required; report availability depends on the account plan. Provider files can be split into multiple parts of up to 64 MB each.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      reportId: z
        .string()
        .optional()
        .describe(
          'Exact report ID from a prior listing; mutually exclusive with listing filters.'
        ),
      reportType: z
        .enum([
          'image_analytics',
          'source_analytics',
          'cdn_logs',
          'mild_errors',
          'credit_analytics_daily',
          'credit_analytics_mtd'
        ])
        .optional(),
      completed: z.boolean().optional(),
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
        .optional(),
      pageNumber,
      pageSize,
      downloadFiles: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Provide downloadable files from this exact completed report; requires reportId.'
        )
    })
  )
  .output(z.object({ reports: z.array(reportOutput), pagination: pagination.optional() }))
  .handleInvocation(async ctx => {
    const input = ctx.input,
      client = new ImgixClient(ctx.auth.token);
    if (input.reportId !== undefined) {
      if (
        input.reportType !== undefined ||
        input.completed !== undefined ||
        input.sort !== undefined ||
        input.pageNumber !== 0 ||
        input.pageSize !== 20
      )
        throw createApiServiceError(
          'Listing filters and paging do not apply to an exact report ID.',
          { parent: {} }
        );
      const report = (await client.getReport(input.reportId)).data;
      if (input.downloadFiles) {
        if (!report.attributes.completed || !report.attributes.files?.length)
          throw createApiServiceError(
            'This report has no completed downloadable files. Read the same report later; no report was generated.',
            { parent: {} }
          );
        for (const url of report.attributes.files) {
          let parsed: URL;
          try {
            parsed = new URL(url);
          } catch {
            throw createApiServiceError('The report returned an invalid file URL.', {
              parent: {}
            });
          }
          if (
            parsed.protocol !== 'https:' ||
            parsed.hostname !== 'storage.googleapis.com' ||
            !parsed.pathname.startsWith('/imgix-reports/') ||
            parsed.username ||
            parsed.password ||
            parsed.port ||
            parsed.hash
          )
            throw createApiServiceError(
              'The report returned an unsupported file host. Download this report in the dashboard.',
              { parent: {} }
            );
          await ctx.addAttachment({ type: 'url', url });
        }
      }
      return {
        output: { reports: [mapReport(report)] },
        message: input.downloadFiles
          ? 'The completed report files are available for download.'
          : 'Retrieved the existing report.'
      };
    }
    if (input.downloadFiles)
      throw createApiServiceError('reportId is required to download an existing report.', {
        parent: {}
      });
    const result = await client.listReports({
      sort: input.sort,
      filterReportType: input.reportType,
      filterCompleted: input.completed,
      pageNumber: input.pageNumber,
      pageSize: input.pageSize
    });
    return {
      output: { reports: result.data.map(mapReport), pagination: result.meta.pagination },
      message: `Found ${result.data.length} report(s) on page ${result.meta.pagination.currentPage}.`
    };
  })
  .build();
