import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignReportTool = SlateTool.create(spec, {
  name: 'Get Campaign Report',
  key: 'get_campaign_report',
  description: `Retrieve performance reports for a specific campaign or list all campaign reports. Returns open rates, click rates, bounce stats, unsubscribes, and e-commerce data. Provide a campaignId for a specific report, or omit to list all reports.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID for a specific report. Omit to list all reports.'),
      count: z
        .number()
        .optional()
        .describe('Number of reports to return when listing (default 100)'),
      offset: z.number().optional().describe('Number of reports to skip when listing'),
      sinceSendTime: z
        .string()
        .optional()
        .describe('Filter reports for campaigns sent after this ISO 8601 date')
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            campaignId: z.string(),
            campaignTitle: z.string(),
            subjectLine: z.string().optional(),
            listId: z.string(),
            listName: z.string().optional(),
            emailsSent: z.number(),
            abuseReports: z.number(),
            unsubscribed: z.number(),
            sendTime: z.string().optional(),
            hardBounces: z.number(),
            softBounces: z.number(),
            opensTotal: z.number(),
            uniqueOpens: z.number(),
            openRate: z.number(),
            clicksTotal: z.number(),
            uniqueClicks: z.number(),
            clickRate: z.number(),
            totalOrders: z.number().optional(),
            totalRevenue: z.number().optional()
          })
        )
        .optional(),
      report: z
        .object({
          campaignId: z.string(),
          campaignTitle: z.string(),
          subjectLine: z.string().optional(),
          listId: z.string(),
          listName: z.string().optional(),
          emailsSent: z.number(),
          abuseReports: z.number(),
          unsubscribed: z.number(),
          sendTime: z.string().optional(),
          hardBounces: z.number(),
          softBounces: z.number(),
          opensTotal: z.number(),
          uniqueOpens: z.number(),
          openRate: z.number(),
          clicksTotal: z.number(),
          uniqueClicks: z.number(),
          clickRate: z.number(),
          totalOrders: z.number().optional(),
          totalRevenue: z.number().optional(),
          forwardsCount: z.number().optional(),
          lastOpen: z.string().optional(),
          lastClick: z.string().optional()
        })
        .optional(),
      totalItems: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let mapReport = (r: any) => ({
      campaignId: r.id,
      campaignTitle: r.campaign_title ?? '',
      subjectLine: r.subject_line,
      listId: r.list_id ?? '',
      listName: r.list_name,
      emailsSent: r.emails_sent ?? 0,
      abuseReports: r.abuse_reports ?? 0,
      unsubscribed: r.unsubscribed ?? 0,
      sendTime: r.send_time || undefined,
      hardBounces: r.bounces?.hard_bounces ?? 0,
      softBounces: r.bounces?.soft_bounces ?? 0,
      opensTotal: r.opens?.opens_total ?? 0,
      uniqueOpens: r.opens?.unique_opens ?? 0,
      openRate: r.opens?.open_rate ?? 0,
      clicksTotal: r.clicks?.clicks_total ?? 0,
      uniqueClicks: r.clicks?.unique_clicks ?? 0,
      clickRate: r.clicks?.click_rate ?? 0,
      totalOrders: r.ecommerce?.total_orders,
      totalRevenue: r.ecommerce?.total_revenue,
      forwardsCount: r.forwards?.forwards_count,
      lastOpen: r.opens?.last_open || undefined,
      lastClick: r.clicks?.last_click || undefined
    });

    if (ctx.input.campaignId) {
      let result = await client.getCampaignReport(ctx.input.campaignId);
      let report = mapReport(result);
      return {
        output: { report },
        message: `Report for **${report.campaignTitle}**: ${report.emailsSent} sent, ${report.uniqueOpens} unique opens (${(report.openRate * 100).toFixed(1)}%), ${report.uniqueClicks} unique clicks (${(report.clickRate * 100).toFixed(1)}%).`
      };
    }

    let result = await client.getReports({
      count: ctx.input.count,
      offset: ctx.input.offset,
      sinceSendTime: ctx.input.sinceSendTime
    });

    let reports = (result.reports ?? []).map(mapReport);

    return {
      output: {
        reports,
        totalItems: result.total_items ?? 0
      },
      message: `Found **${reports.length}** campaign report(s) out of ${result.total_items ?? 0} total.`
    };
  })
  .build();
