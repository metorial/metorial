import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve ConvertAPI account information including conversion balance, usage statistics, and account status.
Useful for monitoring API consumption and checking remaining conversion credits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apiKey: z.number().describe('API key identifier'),
      active: z.boolean().describe('Whether the account is active'),
      fullName: z.string().describe('Account holder full name'),
      email: z.string().describe('Account email address'),
      conversionsTotal: z.number().describe('Total conversion credits available'),
      conversionsConsumed: z.number().describe('Conversion credits already used'),
      conversionsRemaining: z.number().describe('Remaining conversion credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let userInfo = await client.getUserInfo();
    let remaining = userInfo.conversionsTotal - userInfo.conversionsConsumed;

    return {
      output: {
        apiKey: userInfo.apiKey,
        active: userInfo.active,
        fullName: userInfo.fullName,
        email: userInfo.email,
        conversionsTotal: userInfo.conversionsTotal,
        conversionsConsumed: userInfo.conversionsConsumed,
        conversionsRemaining: remaining
      },
      message: `Account **${userInfo.fullName}** (${userInfo.email}): ${remaining} of ${userInfo.conversionsTotal} conversions remaining. Status: ${userInfo.active ? 'Active' : 'Inactive'}.`
    };
  })
  .build();
