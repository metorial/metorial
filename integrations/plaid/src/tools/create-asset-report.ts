import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let createAssetReportTool = SlateTool.create(spec, {
  name: 'Create Asset Report',
  key: 'create_asset_report',
  description: `Initiate an asynchronous Asset Report that summarizes a user's financial history across one or more Items. The report is generated in the background — use the returned token to poll for the completed report. Useful for loan underwriting and financial verification. A webhook will fire when the report is ready.`,
  instructions: [
    'Reports are generated asynchronously. The assetReportToken can be used with Get Asset Report once the report is ready.',
    'Set up a webhook to be notified when the report is complete.'
  ]
})
  .input(
    z.object({
      accessTokens: z
        .array(z.string())
        .describe('Access tokens for the Items to include (1-99)'),
      daysRequested: z.number().describe('Number of days of history to include (0-731)'),
      webhook: z.string().optional().describe('Webhook URL to notify when report is ready'),
      clientReportId: z.string().optional().describe('Your custom identifier for this report')
    })
  )
  .output(
    z.object({
      assetReportToken: z.string().describe('Token to retrieve the completed report'),
      assetReportId: z.string().describe('Unique report identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.createAssetReport(
      ctx.input.accessTokens,
      ctx.input.daysRequested,
      {
        webhook: ctx.input.webhook,
        clientReportId: ctx.input.clientReportId
      }
    );

    return {
      output: {
        assetReportToken: result.asset_report_token,
        assetReportId: result.asset_report_id
      },
      message: `Asset report \`${result.asset_report_id}\` creation initiated. Use the token to retrieve the report once ready.`
    };
  })
  .build();
