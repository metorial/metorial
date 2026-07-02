import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let getAccounts = SlateTool.create(spec, {
  name: 'Get Accounts',
  key: 'get_accounts',
  description: `Retrieve all Leadfeeder accounts accessible by the authenticated user. Each account represents a tracked website and includes subscription type, timezone, and tracking status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string().describe('Unique identifier for the account'),
          name: z.string().describe('Account/website name'),
          subscription: z.string().describe('Subscription type (e.g., trial, premium)'),
          timezone: z.string().describe('Account timezone'),
          websiteTrackingStatus: z
            .string()
            .describe('Tracking status: not_installed, reporting, or ok')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);
    let accounts = await client.getAccounts();

    return {
      output: { accounts },
      message: `Found **${accounts.length}** Leadfeeder account(s).`
    };
  })
  .build();
