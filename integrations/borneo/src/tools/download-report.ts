import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachDownload, listMetadata, readList, redact } from '../lib/responses';
import { spec } from '../spec';

export let downloadReport = SlateTool.create(spec, {
  name: 'Download Dashboard Report',
  key: 'download_report',
  description: `Download or list dashboard reports. Supports privacy operations, data discovery, and data flow report types. Retrieve specific reports by ID or generate new downloadable reports.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z.enum(['download', 'get', 'list', 'delete']).describe('Action to perform'),
      reportId: z.string().optional().describe('Report ID (required for get, delete)'),
      reportType: z
        .enum([
          'DATA_DISCOVERY_DASHBOARD',
          'PRIVACY_OPS_DASHBOARD',
          'PRIVACY_OPS_DATA_FLOW',
          'EXECUTIVE_REPORT',
          'INFRASTRUCTURE_CHANGES',
          'MULTI_ENTITY_PRIVACY_REPORT',
          'PERSONAL_VIOLATIONS_OVERVIEW',
          'ROPA_UPDATES_REPORT',
          'SCANS_SUMMARY',
          'SENSITIVE_DATA_DISTRIBUTION'
        ])
        .optional()
        .describe('Report type to download'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, reportId } = ctx.input;

    switch (action) {
      case 'download': {
        if (!ctx.input.reportType)
          throw createApiServiceError('reportType is required for download action');
        let result = await client.downloadDashboardReport({
          reportType: ctx.input.reportType
        });
        await attachDownload(
          file => ctx.addAttachment(file),
          result.url,
          ctx.auth.token,
          ctx.auth.baseUrl ?? ctx.config.baseUrl
        );
        let data = redact(result, ctx.auth.token);
        return {
          output: { report: data, success: true },
          message: `Dashboard report (**${ctx.input.reportType}**) download initiated.`
        };
      }
      case 'get': {
        if (!reportId) throw createApiServiceError('reportId is required for get action');
        let result = await client.getDashboardReport(reportId);
        let data = result;
        return {
          output: { report: data, success: true },
          message: `Retrieved dashboard report **${reportId}**.`
        };
      }
      case 'list': {
        let result = await client.listDashboardReports({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result;
        let reports = readList(data, 'dashboardReports');
        return {
          output: { reports, success: true, ...listMetadata(data) },
          message: `Found **${reports.length}** dashboard report(s).`
        };
      }
      case 'delete': {
        if (!reportId) throw createApiServiceError('reportId is required for delete action');
        await client.deleteDashboardReport(reportId);
        return {
          output: { success: true },
          message: `Dashboard report **${reportId}** deleted.`
        };
      }
    }
  })
  .build();
