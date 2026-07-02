import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Returns account information including remaining check slots, SMS credits, and SMS auto-refill status. Useful for monitoring resource usage and capacity.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      availableChecks: z
        .number()
        .optional()
        .describe('Number of remaining uptime check slots'),
      availableSmsCredits: z.number().optional().describe('Number of remaining SMS credits'),
      availableSmsTests: z
        .number()
        .optional()
        .describe('Number of remaining SMS test credits'),
      autoRefillSms: z.boolean().optional().describe('Whether SMS auto-refill is enabled'),
      autoRefillSmsAmount: z.number().optional().describe('SMS auto-refill amount'),
      autoRefillSmsWhenLeft: z
        .number()
        .optional()
        .describe('Auto-refill triggers when credits fall below this'),
      maxSmsOverage: z.number().optional().describe('Maximum SMS overage allowed'),
      availableDefaultChecks: z.number().optional().describe('Available default checks'),
      availableTransactionChecks: z
        .number()
        .optional()
        .describe('Available transaction check slots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.getCredits();
    let credits = result.credits || result;

    return {
      output: {
        availableChecks: credits.availablechecks,
        availableSmsCredits: credits.availablesmscredits,
        availableSmsTests: credits.availablesmstests,
        autoRefillSms: credits.autofillsms,
        autoRefillSmsAmount: credits.autofillsms_amount,
        autoRefillSmsWhenLeft: credits.autofillsms_when_left,
        maxSmsOverage: credits.max_sms_overage,
        availableDefaultChecks: credits.availabledefaultchecks,
        availableTransactionChecks: credits.availabletransactionchecks
      },
      message: `Account has **${credits.availablechecks ?? 'unknown'}** available check(s) and **${credits.availablesmscredits ?? 'unknown'}** SMS credit(s).`
    };
  })
  .build();
