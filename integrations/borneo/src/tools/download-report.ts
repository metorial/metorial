import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadReport = SlateTool.create(spec, {
  name: 'Download Dashboard Report',
  key: 'download_report',
  description: `Download or list dashboard reports. Supports privacy operations, data discovery, and data flow report types. Retrieve specific reports by ID or generate new downloadable reports.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['download', 'get', 'list', 'delete']).describe('Action to perform'),
      reportId: z.string().optional().describe('Report ID (required for get, delete)'),
      reportType: z
        .enum(['DATA_DISCOVERY_DASHBOARD', 'PRIVACY_OPS_DASHBOARD', 'PRIVACY_OPS_DATA_FLOW'])
        .optional()
        .describe('Report type to download'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        report: z.any().optional().describe('Report data or download result'),
        reports: z.array(z.any()).optional().describe('List of reports'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, reportId } = ctx.input;

    switch (action) {
      case 'download': {
        if (!ctx.input.reportType)
          throw new Error('reportType is required for download action');
        let result = await client.downloadDashboardReport({
          reportType: ctx.input.reportType
        });
        let data = result?.data ?? result;
        return {
          output: { report: data, success: true },
          message: `Dashboard report (**${ctx.input.reportType}**) download initiated.`
        };
      }
      case 'get': {
        if (!reportId) throw new Error('reportId is required for get action');
        let result = await client.getDashboardReport(reportId);
        let data = result?.data ?? result;
        return {
          output: { report: data, success: true },
          message: `Retrieved dashboard report **${reportId}**.`
        };
      }
      case 'list': {
        let result = await client.listDashboardReports({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let reports = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { reports, success: true },
          message: `Found **${reports.length}** dashboard report(s).`
        };
      }
      case 'delete': {
        if (!reportId) throw new Error('reportId is required for delete action');
        await client.deleteDashboardReport(reportId);
        return {
          output: { success: true },
          message: `Dashboard report **${reportId}** deleted.`
        };
      }
    }
  })
  .build();
