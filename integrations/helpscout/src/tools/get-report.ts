import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve reporting data from Help Scout. Choose from company overview, conversation metrics, or customer satisfaction (happiness) reports. All reports require a date range.`,
  tags: { readOnly: true },
  constraints: ['Date format must be ISO 8601 (e.g., "2024-01-01T00:00:00Z").']
})
  .input(
    z.object({
      reportType: z
        .enum(['company', 'conversations', 'happiness'])
        .describe('Type of report to retrieve'),
      start: z.string().describe('Start date/time in ISO 8601 format'),
      end: z.string().describe('End date/time in ISO 8601 format'),
      previousStart: z.string().optional().describe('Previous period start for comparison'),
      previousEnd: z.string().optional().describe('Previous period end for comparison'),
      mailboxes: z
        .string()
        .optional()
        .describe('Comma-separated list of mailbox IDs to filter by'),
      tags: z.string().optional().describe('Comma-separated list of tag IDs to filter by'),
      types: z
        .string()
        .optional()
        .describe('Comma-separated list of conversation types to filter by'),
      folders: z
        .string()
        .optional()
        .describe('Comma-separated list of folder IDs to filter by')
    })
  )
  .output(
    z.object({
      report: z
        .record(z.string(), z.any())
        .describe('Report data (structure varies by report type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    let params = {
      start: ctx.input.start,
      end: ctx.input.end,
      previousStart: ctx.input.previousStart,
      previousEnd: ctx.input.previousEnd,
      mailboxes: ctx.input.mailboxes,
      tags: ctx.input.tags,
      types: ctx.input.types,
      folders: ctx.input.folders
    };

    let report: any;
    if (ctx.input.reportType === 'company') {
      report = await client.getCompanyReport(params);
    } else if (ctx.input.reportType === 'conversations') {
      report = await client.getConversationsReport(params);
    } else {
      report = await client.getHappinessReport(params);
    }

    return {
      output: { report },
      message: `Retrieved **${ctx.input.reportType}** report for ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();
