import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve results from a Pendo visitor or account report by report ID. Only visitor and account reports are available via the API — paths, funnels, workflows, retention, and Data Explorer reports are not supported.`,
  constraints: [
    'Only Visitor and Account report types are supported.',
    'Paths, funnels, workflows, retention, and Data Explorer reports cannot be retrieved via the API.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z.string().describe('The report ID to retrieve results for')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('The report ID'),
      results: z.any().describe('Report result data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let results = await client.getReport(ctx.input.reportId, 'json');

    return {
      output: {
        reportId: ctx.input.reportId,
        results
      },
      message: `Retrieved results for report **${ctx.input.reportId}**.`
    };
  })
  .build();
