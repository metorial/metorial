import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

let reportSummarySchema = z.object({
  reportId: z.string().optional().describe('Report ID'),
  title: z.string().optional().describe('Report title'),
  reportType: z
    .string()
    .optional()
    .describe('Type of report (threat_analysis, malware, osint, industry, threat_group)'),
  created: z.string().optional().describe('Report creation date'),
  summary: z.string().optional().describe('Report summary or abstract'),
  tags: z.array(z.string()).optional().describe('Tags associated with the report'),
  tlp: z.string().optional().describe('TLP color marking')
});

export let getThreatReport = SlateTool.create(spec, {
  name: 'Get Threat Reports',
  key: 'get_threat_reports',
  description: `List or retrieve IBM X-Force premier threat intelligence reports. Includes Threat Analysis, OSINT Advisory, Malware Analysis, Industry Profile, and Threat Group Profile reports.
Reports can be filtered by type and date range. Provide a reportId to get its details, or omit it to list available reports of the selected type (default: threatanalysis).`,
  instructions: [
    'Omit reportId to list reports of reportType, optionally filtered by date range.',
    'Provide a reportId to retrieve the full content of a specific report.'
  ],
  constraints: [
    'Premier threat intelligence reports require the appropriate paid API subscription.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.string().optional().describe('Specific report ID to retrieve full content'),
      reportType: z
        .string()
        .optional()
        .describe(
          'Report type: threatanalysis (default), osintadvisory, malware, industry, or threatgroup. Legacy threat_analysis, osint, and threat_group values are also accepted.'
        ),
      startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of reports to list (1-200)'),
      skip: z
        .number()
        .optional()
        .describe('Number of reports to skip when listing (default: 0)')
    })
  )
  .output(
    z.object({
      reports: z.array(reportSummarySchema).optional().describe('List of report summaries'),
      report: z
        .object({
          reportId: z.string().optional().describe('Report ID'),
          title: z.string().optional().describe('Report title'),
          reportType: z.string().optional().describe('Report type'),
          created: z.string().optional().describe('Report creation date'),
          content: z.string().optional().describe('Full report content/body'),
          summary: z.string().optional().describe('Report summary'),
          tags: z.array(z.string()).optional().describe('Report tags'),
          indicators: z
            .array(z.record(z.string(), z.any()))
            .optional()
            .describe('Associated indicators of compromise'),
          objects: z
            .array(z.record(z.string(), z.any()))
            .optional()
            .describe('STIX objects included in the report details'),
          tlp: z.string().optional().describe('TLP marking')
        })
        .optional()
        .describe('Full report details (when reportId is provided)'),
      totalCount: z.number().optional().describe('Total number of matching reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    let limit = ctx.input.limit ?? 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw createApiServiceError('limit must be an integer between 1 and 200.');
    }
    if (
      ctx.input.skip !== undefined &&
      (!Number.isInteger(ctx.input.skip) || ctx.input.skip < 0)
    ) {
      throw createApiServiceError('skip must be a non-negative integer.');
    }

    if (ctx.input.reportId) {
      ctx.progress('Fetching threat report...');
      let data = await client.getThreatReport(ctx.input.reportId);
      let objects = Array.isArray(data.objects) ? data.objects : undefined;
      let report = objects?.find((object: any) => object.type === 'report') ?? data;
      return {
        output: {
          report: {
            reportId: report.id || ctx.input.reportId,
            title: report.name ?? report.title,
            reportType: report.o_type ?? report.type,
            created: report.created,
            content: report.description ?? report.content ?? report.abstract,
            summary: report.x_com_ibm_short_description ?? report.summary ?? report.abstract,
            tags: report.labels ?? report.tags,
            indicators:
              objects?.filter((object: any) => object.type === 'indicator') ??
              report.indicators,
            objects,
            tlp: report.tlp
          }
        },
        message: `Retrieved report: **${report.name ?? report.title ?? ctx.input.reportId}**`
      };
    }

    ctx.progress('Listing threat reports...');
    let data = await client.getThreatReports({
      type: ctx.input.reportType,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      limit,
      skip: ctx.input.skip
    });

    let reports = (data.rows || data || []).map((r: any) => ({
      reportId: r.id || r.reportId,
      title: r.name ?? r.title,
      reportType: r.type,
      created: r.created,
      summary: r.shortDescription ?? r.summary ?? r.abstract,
      tags: r.tags,
      tlp: r.tlp
    }));

    return {
      output: {
        reports,
        totalCount: data.totalRows ?? reports.length
      },
      message: `Found **${reports.length}** threat report(s)${ctx.input.reportType ? ` of type "${ctx.input.reportType}"` : ''}`
    };
  })
  .build();
