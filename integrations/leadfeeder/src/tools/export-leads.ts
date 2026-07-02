import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let exportLeads = SlateTool.create(spec, {
  name: 'Export Leads',
  key: 'export_leads',
  description: `Request a bulk export of lead data for a given account and feed over a date range. The export is asynchronous: this tool submits the request and returns the export ID and status. Use the returned exportId with **Get Export Status** to check progress and download.`,
  instructions: [
    'A customFeedId is required — use Get Custom Feeds to find available feed IDs.'
  ],
  constraints: ['Limited to 5 export requests per minute.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Leadfeeder account ID. Falls back to config or first available account.'),
      customFeedId: z.string().describe('Custom feed ID to export leads from'),
      startDate: z.string().describe('Start date in yyyy-mm-dd format'),
      endDate: z.string().describe('End date in yyyy-mm-dd format')
    })
  )
  .output(
    z.object({
      exportId: z.string().describe('Export request ID for status polling'),
      status: z.string().describe('Current status: pending, processed, or failed'),
      createdAt: z.string(),
      statusUrl: z.string().describe('URL to check export status'),
      downloadUrl: z.string().describe('URL to download the report when processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);

    let accountId = ctx.input.accountId ?? ctx.config.accountId;
    if (!accountId) {
      let accounts = await client.getAccounts();
      if (accounts.length === 0) throw new Error('No Leadfeeder accounts found');
      accountId = accounts[0]!.accountId;
    }

    let exportRequest = await client.createExportRequest(accountId, ctx.input.customFeedId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: exportRequest,
      message: `Export request created with ID **${exportRequest.exportId}** (status: ${exportRequest.status}). Poll using Get Export Status to check when the download is ready.`
    };
  })
  .build();
