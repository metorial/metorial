import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Fetch the results of a previously generated report using its hash. Reports are generated asynchronously; use the hash returned by the "Generate Report" tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportHash: z.string().describe('The hash identifier returned from report generation')
    })
  )
  .output(
    z.object({
      reportData: z.any().describe('Report data containing campaign statistics'),
      ready: z.boolean().describe('Whether the report is ready')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.getReport(ctx.input.reportHash);

    return {
      output: {
        reportData: result,
        ready: true
      },
      message: `Report data retrieved successfully.`
    };
  })
  .build();
