import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve details about the configured Reddit Ads account, including account name, status, currency, and available funding instruments. Useful for verifying account configuration and checking billing setup.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      currency: z.string().optional(),
      fundingInstruments: z.array(z.any()).optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let account = await client.getAccount();
    let fundingInstruments: any[] = [];

    try {
      fundingInstruments = await client.listFundingInstruments();
    } catch {
      // Funding instruments may not be accessible with current permissions
    }

    return {
      output: {
        accountId: account.id || account.account_id || ctx.config.accountId,
        name: account.name,
        status: account.status,
        currency: account.currency,
        fundingInstruments,
        raw: account
      },
      message: `Account **${account.name || ctx.config.accountId}** — Status: **${account.status || 'unknown'}**, Currency: **${account.currency || 'unknown'}**.`
    };
  })
  .build();
