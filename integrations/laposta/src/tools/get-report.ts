import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapReport, reportOutputSchema } from '../lib/maps';
import { spec } from '../spec';

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
