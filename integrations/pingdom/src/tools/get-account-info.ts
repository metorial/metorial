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
      checkLimit: z.number().optional().describe('Total check slots'),
      usedDefaultChecks: z.number().optional().describe('Used uptime check slots'),
      usedTransactionChecks: z.number().optional().describe('Used transaction check slots'),
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
      availableDefaultChecks: z
        .number()
        .optional()
        .describe('Legacy field; Pingdom does not provide separate remaining uptime capacity'),
      availableTransactionChecks: z
        .number()
        .optional()
        .describe(
          'Legacy field; Pingdom does not provide separate remaining transaction capacity'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.getCredits();
    let credits = result.credits;

    return {
      output: {
        checkLimit: credits.checklimit,
        usedDefaultChecks: credits.useddefault,
        usedTransactionChecks: credits.usedtransaction,
        availableChecks: credits.availablechecks,
        availableSmsCredits: credits.availablesms,
        availableSmsTests: credits.availablesmstests,
        autoRefillSms: credits.autofillsms,
        autoRefillSmsAmount: credits.autofillsms_amount,
        autoRefillSmsWhenLeft: credits.autofillsms_when_left,
        maxSmsOverage: credits.max_sms_overage,
        availableDefaultChecks: undefined,
        availableTransactionChecks: undefined
      },
      message: `Account has **${credits.availablechecks ?? 'unknown'}** available check(s) and **${credits.availablesms ?? 'unknown'}** SMS credit(s).`
    };
  })
  .build();
