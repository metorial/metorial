import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List public Pendo visitor and account reports available through the API. Use this to discover report IDs before calling Get Report.`,
  constraints: [
    'Only public Visitor and Account report types are available through the Pendo report API.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportId: z.string().describe('Report ID'),
            name: z.string().describe('Report name'),
            raw: z.any().describe('Full raw report record from Pendo')
          })
        )
        .describe('List of public reports'),
      totalCount: z.number().describe('Total number of reports returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let reports = await client.listReports();

    let mappedReports = (Array.isArray(reports) ? reports : []).map((report: any) => ({
      reportId: report.id || report.reportId || '',
      name: report.name || report.title || '',
      raw: report
    }));

    return {
      output: {
        reports: mappedReports,
        totalCount: mappedReports.length
      },
      message: `Found **${mappedReports.length}** public report(s) in Pendo.`
    };
  })
  .build();
