import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let getTrackingScript = SlateTool.create(spec, {
  name: 'Get Tracking Script',
  key: 'get_tracking_script',
  description: `Retrieve the JavaScript tracking script for a Leadfeeder account. This script needs to be installed on webpages to enable visitor identification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Leadfeeder account ID. Falls back to config or first available account.')
    })
  )
  .output(
    z.object({
      scriptHash: z.string().describe('Hash identifying the tracking script version'),
      scriptHtml: z.string().describe('HTML/JavaScript snippet to install on webpages'),
      timezone: z.string().describe('Timezone configured for the tracking script')
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

    let script = await client.getTrackingScript(accountId);

    return {
      output: script,
      message: `Retrieved tracking script for account (timezone: ${script.timezone}).`
    };
  })
  .build();
