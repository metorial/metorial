import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

export let getEmailCampaignReport = SlateTool.create(spec, {
  name: 'Get Email Campaign Report',
  key: 'get_email_campaign_report',
  description: `Retrieve a detailed report for an email campaign including summary statistics, opens, clicks, bounces, unsubscribes, complaints, and per-domain breakdown.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the email campaign'),
      includeOpens: z.boolean().optional().describe('Include list of contacts who opened'),
      includeClicks: z.boolean().optional().describe('Include click details'),
      includeBounces: z.boolean().optional().describe('Include bounce details'),
      includeUnsubscribed: z.boolean().optional().describe('Include unsubscribed contacts'),
      includeComplaints: z.boolean().optional().describe('Include spam complaints'),
      includeDomains: z.boolean().optional().describe('Include per-domain statistics'),
      page: z.number().optional().describe('Page number for sub-reports'),
      limit: z.number().optional().describe('Limit for sub-reports')
    })
  )
  .output(
    z.object({
      summary: z.any().describe('Campaign report summary'),
      opens: z.array(z.any()).optional().describe('Contacts who opened'),
      clicks: z.array(z.any()).optional().describe('Click details'),
      bounces: z.array(z.any()).optional().describe('Bounce details'),
      unsubscribed: z.array(z.any()).optional().describe('Unsubscribed contacts'),
      complaints: z.array(z.any()).optional().describe('Spam complaints'),
      domains: z.array(z.any()).optional().describe('Per-domain statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let { campaignId, page, limit } = ctx.input;
    let pagination = { page, limit };

    let summary = await client.getCampaignReport(campaignId);
    let output: Record<string, any> = { summary };

    if (ctx.input.includeOpens) {
      output.opens = await client.getCampaignReportOpens(campaignId, pagination);
    }
    if (ctx.input.includeClicks) {
      output.clicks = await client.getCampaignReportClicks(campaignId, pagination);
    }
    if (ctx.input.includeBounces) {
      output.bounces = await client.getCampaignReportBounces(campaignId, pagination);
    }
    if (ctx.input.includeUnsubscribed) {
      output.unsubscribed = await client.getCampaignReportUnsubscribed(campaignId, pagination);
    }
    if (ctx.input.includeComplaints) {
      output.complaints = await client.getCampaignReportComplaints(campaignId, pagination);
    }
    if (ctx.input.includeDomains) {
      output.domains = await client.getCampaignReportDomains(campaignId);
    }

    return {
      output: output as any,
      message: `Retrieved report for email campaign **${campaignId}**.`
    };
  })
  .build();

export let listCampaignReports = SlateTool.create(spec, {
  name: 'List Campaign Reports',
  key: 'list_campaign_reports',
  description: `List summary reports for all email campaigns with optional date filtering. Returns high-level statistics for each campaign.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      fromDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      reports: z.array(z.any()).describe('List of campaign reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listCampaignReports({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let reports = Array.isArray(result) ? result : [];
    return {
      output: { reports },
      message: `Found **${reports.length}** campaign report(s).`
    };
  })
  .build();

export let getSmsCampaignReport = SlateTool.create(spec, {
  name: 'Get SMS Campaign Report',
  key: 'get_sms_campaign_report',
  description: `Retrieve a detailed report for an SMS campaign including delivery, click, and failure statistics.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the SMS campaign')
    })
  )
  .output(
    z.object({
      report: z.any().describe('SMS campaign report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let report = await client.getSmsCampaignReport(ctx.input.campaignId);
    return {
      output: { report },
      message: `Retrieved report for SMS campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
