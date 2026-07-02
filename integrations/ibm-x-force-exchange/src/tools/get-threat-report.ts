import { SlateTool } from 'slates';
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
Reports can be filtered by type and date range. Provide a reportId to get the full report content, or omit it to list/search available reports.`,
  instructions: [
    'Omit reportId to list reports, optionally filtered by type and date range.',
    'Provide a reportId to retrieve the full content of a specific report.'
  ],
  constraints: [
    'Full reports require a paid subscription (Standard or Premium tier).',
    'A limited set of sample reports is available to free-tier users.'
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
          'Filter by report type (e.g., threat_analysis, malware, osint, industry, threat_group)'
        ),
      startDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of reports to list')
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

    if (ctx.input.reportId) {
      ctx.progress('Fetching threat report...');
      let data = await client.getThreatReport(ctx.input.reportId);
      return {
        output: {
          report: {
            reportId: data.id || ctx.input.reportId,
            title: data.title,
            reportType: data.type,
            created: data.created,
            content: data.content || data.abstract,
            summary: data.summary || data.abstract,
            tags: data.tags,
            indicators: data.indicators,
            tlp: data.tlp
          }
        },
        message: `Retrieved report: **${data.title || ctx.input.reportId}**`
      };
    }

    ctx.progress('Listing threat reports...');
    let data = await client.getThreatReports({
      type: ctx.input.reportType,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      limit: ctx.input.limit || 25
    });

    let reports = (data.rows || data || []).map((r: any) => ({
      reportId: r.id || r.reportId,
      title: r.title,
      reportType: r.type,
      created: r.created,
      summary: r.summary || r.abstract,
      tags: r.tags,
      tlp: r.tlp
    }));

    return {
      output: {
        reports,
        totalCount: data.totalRows || reports.length
      },
      message: `Found **${reports.length}** threat report(s)${ctx.input.reportType ? ` of type "${ctx.input.reportType}"` : ''}`
    };
  })
  .build();
