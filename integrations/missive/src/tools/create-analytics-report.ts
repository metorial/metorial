import { createApiServiceError, getApiErrorStatus, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAnalyticsReport = SlateTool.create(spec, {
  name: 'Create Analytics Report',
  key: 'create_analytics_report',
  description: `Generate an analytics report for a specified time period. Report generation is asynchronous — the report is created first, then fetched after a short delay. The tool handles the polling automatically and returns the completed report.
Supports filtering by team, users, labels, accounts, and account types.
Requires a Productive or Business plan; filtering capabilities require Business plan.`,
  constraints: [
    'Report generation takes 2-30 seconds. The tool will poll for up to 60 seconds.',
    'Reports expire 60 seconds after generation.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID to generate report for'),
      start: z.string().describe('Start date/time (ISO 8601 string)'),
      end: z.string().describe('End date/time (ISO 8601 string)'),
      timeZone: z.string().optional().describe('Timezone string, e.g. "America/New_York"'),
      teamIds: z.array(z.string()).optional().describe('Filter by team IDs'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      accountIds: z.array(z.string()).optional().describe('Filter by account IDs'),
      accountTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by account types (email, sms, whatsapp, instagram, messenger, live_chat, custom)'
        ),
      sharedLabelIds: z.array(z.string()).optional().describe('Filter by shared label IDs')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('Report ID'),
      report: z.any().describe('Full report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let start = Date.parse(ctx.input.start);
    let end = Date.parse(ctx.input.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw createApiServiceError(
        'Provide valid ISO 8601 start and end dates, with end after start.'
      );
    }

    let body: Record<string, any> = {
      organization: ctx.input.organizationId,
      start: Math.floor(start / 1000),
      end: Math.floor(end / 1000)
    };
    if (ctx.input.timeZone) body.time_zone = ctx.input.timeZone;
    if (ctx.input.teamIds) body.teams = ctx.input.teamIds;
    if (ctx.input.userIds) body.users = ctx.input.userIds;
    if (ctx.input.accountIds) body.accounts = ctx.input.accountIds;
    if (ctx.input.accountTypes) body.account_types = ctx.input.accountTypes;
    if (ctx.input.sharedLabelIds) body.shared_labels = ctx.input.sharedLabelIds;

    let createData = await client.createAnalyticsReport(body);
    let reportId = createData.reports?.id;

    if (!reportId)
      throw createApiServiceError('Missive did not return an analytics report ID.');

    ctx.info('Report created, polling for completion...');

    let report: any = null;
    let maxAttempts = 12;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      try {
        let reportData = await client.getAnalyticsReport(reportId);
        report = reportData;
        break;
      } catch (error) {
        let upstreamStatus =
          isApiErrorRecord(error) && isApiErrorRecord(error.data)
            ? error.data.upstreamStatus
            : undefined;
        let status =
          typeof upstreamStatus === 'number' || typeof upstreamStatus === 'string'
            ? upstreamStatus
            : getApiErrorStatus(error);
        if (String(status) !== '404' || i === maxAttempts - 1) throw error;
      }
    }

    if (!report) {
      throw createApiServiceError('Report generation timed out after 60 seconds.');
    }

    return {
      output: {
        reportId,
        report
      },
      message: `Generated analytics report **${reportId}** for the specified period.`
    };
  })
  .build();
