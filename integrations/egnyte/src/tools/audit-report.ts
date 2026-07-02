import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let createAuditReportTool = SlateTool.create(spec, {
  name: 'Create Audit Report',
  key: 'create_audit_report',
  description: `Generate an audit report in Egnyte for login activity, file actions, permission changes, user provisioning, or group management. Reports are generated asynchronously — use the returned report ID to check status and retrieve results.`,
  instructions: [
    'Reports are generated asynchronously. After creating, use "Get Audit Report" with the returned ID to check status and retrieve results.',
    'Date parameters use ISO 8601 format (e.g. "2024-01-01T00:00:00")'
  ]
})
  .input(
    z.object({
      reportType: z
        .enum(['logins', 'files', 'permissions', 'users', 'groups'])
        .describe('Type of audit report'),
      format: z
        .enum(['json', 'csv'])
        .optional()
        .describe('Report output format (default: json)'),
      dateStart: z.string().describe('Start date for the report (ISO 8601)'),
      dateEnd: z.string().describe('End date for the report (ISO 8601)'),
      transactionType: z
        .string()
        .optional()
        .describe(
          'For file reports: filter by action type (e.g. "download", "preview", "upload")'
        ),
      users: z.array(z.string()).optional().describe('Filter by specific usernames'),
      folders: z.array(z.string()).optional().describe('Filter by specific folder paths')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('ID to retrieve the report results'),
      reportType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let body: Record<string, unknown> = {
      format: ctx.input.format || 'json',
      date_start: ctx.input.dateStart,
      date_end: ctx.input.dateEnd
    };

    if (ctx.input.transactionType) body.transaction_type = ctx.input.transactionType;
    if (ctx.input.users) body.users = ctx.input.users;
    if (ctx.input.folders) body.folders = ctx.input.folders;

    let result = (await client.createAuditReport(ctx.input.reportType, body)) as Record<
      string,
      unknown
    >;

    return {
      output: {
        reportId: String(result.id || ''),
        reportType: ctx.input.reportType
      },
      message: `Created ${ctx.input.reportType} audit report — ID: **${result.id}**. Use "Get Audit Report" to retrieve results.`
    };
  })
  .build();

export let getAuditReportTool = SlateTool.create(spec, {
  name: 'Get Audit Report',
  key: 'get_audit_report',
  description: `Retrieve the results of a previously created audit report in Egnyte. If the report is still being generated, the status will indicate it is not yet ready.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['logins', 'files', 'permissions', 'users', 'groups'])
        .describe('Type of audit report'),
      reportId: z.string().describe('Report ID returned from creating the audit report')
    })
  )
  .output(
    z.object({
      reportId: z.string(),
      status: z.string().optional().describe('Report generation status'),
      events: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Report event data (if ready and format is JSON)'),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.getAuditReport(
      ctx.input.reportType,
      ctx.input.reportId
    )) as Record<string, unknown>;

    let events = Array.isArray(result.events)
      ? (result.events as Record<string, unknown>[])
      : undefined;

    return {
      output: {
        reportId: ctx.input.reportId,
        status: result.status ? String(result.status) : 'completed',
        events,
        totalCount:
          typeof result.total_count === 'number' ? result.total_count : events?.length
      },
      message: events
        ? `Audit report ready — **${events.length}** event(s) returned`
        : `Audit report status: ${result.status || 'unknown'}`
    };
  })
  .build();
