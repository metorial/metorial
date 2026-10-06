import { getResponseHeaderValue, SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { invalid, record, requiredList } from '../lib/contracts';
import { spec } from '../spec';

export let createAuditReportTool = SlateTool.create(spec, {
  name: 'Create Audit Report',
  key: 'create_audit_report',
  description: `Generate an audit report in Egnyte for login activity, file actions, permission changes, user provisioning, or group management. Reports are generated asynchronously — use the returned report ID to check status and retrieve results.`,
  instructions: [
    'Reports are generated asynchronously. After creating, use "Get Audit Report" with the returned ID to check status and retrieve results.',
    'Date parameters use ISO 8601 format (e.g. "2024-01-01T00:00:00")',
    'The provider may notify the requesting user when the report completes unless suppressEmails is true.'
  ]
})
  .input(
    z.object({
      suppressEmails: z
        .boolean()
        .optional()
        .describe('Suppress report completion email notifications'),
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
    let client = new EgnyteClient(ctx.auth);

    let body: Record<string, unknown> = {
      format: ctx.input.format || 'json',
      date_start: ctx.input.dateStart,
      date_end: ctx.input.dateEnd
    };

    const start = Date.parse(ctx.input.dateStart);
    const end = Date.parse(ctx.input.dateEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      throw invalid('Provide valid report dates with the end after the start.');
    if (ctx.input.transactionType !== undefined && ctx.input.reportType !== 'files')
      throw invalid('Transaction filters apply only to file reports.');
    if (
      ctx.input.folders !== undefined &&
      !['files', 'permissions'].includes(ctx.input.reportType)
    )
      throw invalid('Folder filters apply only to file or permission reports.');
    if (ctx.input.reportType === 'files' && !ctx.input.folders?.length)
      throw invalid('File reports require at least one absolute folder path.');
    if (ctx.input.transactionType) body.transaction_type = [ctx.input.transactionType];
    if (ctx.input.users)
      body[
        ctx.input.reportType === 'permissions'
          ? 'assigners'
          : ctx.input.reportType === 'users'
            ? 'performed_by'
            : 'users'
      ] = ctx.input.users;
    if (ctx.input.folders) body.folders = ctx.input.folders;
    if (ctx.input.reportType === 'logins')
      body.events = [
        'logins',
        'logouts',
        'account_lockouts',
        'password_resets',
        'failed_attempts'
      ];
    if (ctx.input.suppressEmails !== undefined)
      body.suppress_emails = ctx.input.suppressEmails;

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
  description: `Check an audit report generation job, then retrieve its JSON page or prepare the CSV report for download when complete. Check again no more frequently than every two minutes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['logins', 'files', 'permissions', 'users', 'groups'])
        .describe('Type of audit report'),
      reportId: z.string().describe('Job ID returned from creating the audit report'),
      offset: z.number().optional().describe('JSON report event offset'),
      count: z.number().optional().describe('JSON report page size (1–1000)')
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
      totalCount: z.number().optional(),
      format: z.string().optional(),
      offset: z.number().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient(ctx.auth);

    const status = await client.getAuditReportStatus(ctx.input.reportId);
    if (status.status === 'running')
      return {
        output: { reportId: ctx.input.reportId, status: 'running' },
        message: 'The report is still generating. Check again after at least two minutes.'
      };
    const expectedUrl = `${client.baseUrl}/pubapi/v1/audit/${encodeURIComponent(ctx.input.reportType)}/${encodeURIComponent(ctx.input.reportId)}`;
    let completedUrl: string;
    try {
      completedUrl = new URL(status.location ?? '', client.baseUrl).toString();
    } catch {
      throw invalid('Egnyte returned an invalid completed report reference.');
    }
    if (!status.location || completedUrl !== expectedUrl)
      throw invalid('Egnyte returned a different or missing completed report reference.');
    const response = await client.getAuditReport(ctx.input.reportType, ctx.input.reportId, {
      offset: ctx.input.offset,
      count: ctx.input.count
    });
    const contentType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    if (contentType === 'text/csv') {
      if (ctx.input.offset !== undefined || ctx.input.count !== undefined)
        throw invalid('CSV reports do not support JSON pagination.');
      await ctx.addAttachment({
        type: 'url',
        url: expectedUrl,
        mimeType: 'text/csv',
        headers: { Authorization: `Bearer ${ctx.auth.token}` }
      });
      return {
        output: { reportId: ctx.input.reportId, status: 'completed', format: 'csv' },
        message: 'The completed audit report is ready to download.'
      };
    }
    if (contentType !== 'application/json')
      throw invalid('Egnyte returned an unsupported audit report format.');
    const result = record(response.data);
    const events = requiredList(result.events);
    const offset = typeof result.offset === 'number' ? result.offset : (ctx.input.offset ?? 0);
    const totalCount = typeof result.total_count === 'number' ? result.total_count : undefined;
    return {
      output: {
        reportId: ctx.input.reportId,
        status: 'completed',
        format: 'json',
        events,
        totalCount,
        offset,
        hasMore: totalCount === undefined ? undefined : offset + events.length < totalCount
      },
      message: `Retrieved ${events.length} audit events from the completed report.`
    };
  })
  .build();
