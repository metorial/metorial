import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve eSputnik account information and current organization balance including credit limits, currency, and bonus allocations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organisationName: z.string().optional().describe('Organization name'),
      currentBalance: z.string().optional().describe('Current account balance'),
      creditLimit: z.string().optional().describe('Credit limit'),
      currency: z.string().optional().describe('Account currency'),
      bonusEmails: z.string().optional().describe('Number of bonus emails available'),
      bonusSms: z.string().optional().describe('Number of bonus SMS available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [accountInfo, balance] = await Promise.all([
      client.getAccountInfo(),
      client.getBalance()
    ]);

    return {
      output: {
        organisationName: accountInfo?.organisationName || accountInfo?.name,
        currentBalance: balance?.currentBalance,
        creditLimit: balance?.creditLimit,
        currency: balance?.currency,
        bonusEmails: balance?.bonusEmails,
        bonusSms: balance?.bonusSmses
      },
      message: `Account: **${accountInfo?.organisationName || accountInfo?.name || 'Unknown'}**. Balance: ${balance?.currentBalance || '0'} ${balance?.currency || ''}.`
    };
  })
  .build();
