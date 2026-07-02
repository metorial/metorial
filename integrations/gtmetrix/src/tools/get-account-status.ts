import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStatus = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description: `Retrieves the current GTmetrix account status including API credit balance, next refill time, account type, and feature access flags. Use this to check available credits before running tests.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Account user/API key ID'),
      apiCredits: z.number().describe('Current API credit balance'),
      apiRefill: z.number().describe('Unix timestamp of next credit refill'),
      apiRefillAmount: z.number().describe('Number of credits added at each refill'),
      accountType: z.string().describe('Account type: "Basic", "PRO", or "Team"'),
      proAnalysisOptionsAccess: z.boolean().describe('Has access to PRO analysis options'),
      proLocationsAccess: z.boolean().describe('Has access to PRO test locations'),
      whitelabelPdfAccess: z.boolean().describe('Has access to white-label PDF reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let status = await client.getAccountStatus();

    let refillDate = new Date(status.apiRefill * 1000).toISOString();

    return {
      output: status,
      message: `**${status.accountType}** account — **${status.apiCredits}** credits remaining. Next refill of **${status.apiRefillAmount}** credits at ${refillDate}.`
    };
  })
  .build();
