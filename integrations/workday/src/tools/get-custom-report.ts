import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomReport = SlateTool.create(spec, {
  name: 'Get Custom Report',
  key: 'get_custom_report',
  description: `Retrieve data from a Workday custom report via Report-as-a-Service (RaaS). Reports must be Advanced type and web-service enabled in Workday. Supports passing prompt parameters to filter report data.`,
  instructions: [
    'The report must be configured as an Advanced type report with "Enable As Web Service" checked in Workday',
    'The report owner is typically the Workday username of the report creator',
    'Prompt parameters correspond to report prompts configured in Workday'
  ],
  constraints: [
    'RaaS does not natively support pagination — large reports may take longer to return',
    'Workday enforces a timeout limit (typically 30 minutes) and a 2GB response size limit'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportOwner: z.string().describe('Workday username of the report owner'),
      reportName: z.string().describe('Name of the custom report'),
      format: z.enum(['json', 'csv']).optional().describe('Response format (default: json)'),
      prompts: z
        .record(z.string(), z.string())
        .optional()
        .describe('Report prompt parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      reportData: z
        .any()
        .describe(
          'Report data returned by Workday (structure depends on the report definition)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.getCustomReport(ctx.input.reportOwner, ctx.input.reportName, {
      format: ctx.input.format,
      prompts: ctx.input.prompts
    });

    return {
      output: {
        reportData: result
      },
      message: `Retrieved custom report **${ctx.input.reportName}** owned by ${ctx.input.reportOwner}.`
    };
  })
  .build();
