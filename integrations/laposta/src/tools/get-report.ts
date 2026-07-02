import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reportOutputSchema = z.object({
  campaignId: z.string().describe('Campaign this report belongs to'),
  sent: z.number().describe('Total emails sent'),
  accepted: z.number().describe('Emails accepted by mail servers'),
  cleaned: z.number().describe('Addresses cleaned (removed)'),
  complained: z.number().describe('Spam complaints'),
  hardbounced: z.number().describe('Hard bounces'),
  softbounced: z.number().describe('Soft bounces'),
  unsubscribed: z.number().describe('Unsubscribes from the campaign'),
  openedUnique: z.number().describe('Unique opens'),
  clickedUnique: z.number().describe('Unique clicks'),
  webversionUnique: z.number().describe('Unique web version views'),
  acceptedRatio: z.number().describe('Acceptance ratio (0-1)'),
  openedRatio: z.number().describe('Open ratio (0-1)'),
  clickedRatio: z.number().describe('Click ratio (0-1)')
});

export let getReport = SlateTool.create(spec, {
  name: 'Get Campaign Report',
  key: 'get_campaign_report',
  description: `Retrieves performance statistics for sent Laposta campaigns. Provide a **campaignId** to get a specific report, or omit it to get reports for all campaigns. Includes delivery metrics, engagement rates, bounces, and unsubscribes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('ID of the campaign to get the report for. Omit to get all reports.')
    })
  )
  .output(
    z.object({
      reports: z.array(reportOutputSchema).describe('Campaign performance reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapReport = (r: any) => ({
      campaignId: r.campaign_id,
      sent: r.sent,
      accepted: r.accepted,
      cleaned: r.cleaned,
      complained: r.complained,
      hardbounced: r.hardbounced,
      softbounced: r.softbounced,
      unsubscribed: r.unsubscribed,
      openedUnique: r.opened_unique,
      clickedUnique: r.clicked_unique,
      webversionUnique: r.webversion_unique,
      acceptedRatio: r.accepted_ratio,
      openedRatio: r.opened_ratio,
      clickedRatio: r.clicked_ratio
    });

    if (ctx.input.campaignId) {
      let result = await client.getReport(ctx.input.campaignId);
      let report = mapReport(result.report);
      return {
        output: { reports: [report] },
        message: `Report for campaign ${report.campaignId}: ${report.sent} sent, ${report.openedUnique} opened (${(report.openedRatio * 100).toFixed(1)}%), ${report.clickedUnique} clicked (${(report.clickedRatio * 100).toFixed(1)}%).`
      };
    }

    let results = await client.getReports();
    let reports = results.map(r => mapReport(r.report));
    return {
      output: { reports },
      message: `Retrieved reports for ${reports.length} campaign(s).`
    };
  })
  .build();
