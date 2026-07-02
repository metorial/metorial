import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountUsage = SlateTool.create(spec, {
  name: 'Get Account Usage',
  key: 'get_account_usage',
  description: `Retrieve Papertrail account information and usage data, including the account name, plan details, and log volume consumed.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Unique account ID'),
      name: z.string().describe('Account name'),
      planName: z.string().optional().describe('Name of the current plan'),
      logDataTransferUsed: z.number().optional().describe('Log data transfer used in bytes'),
      logDataTransferPlanLimit: z
        .number()
        .optional()
        .describe('Log data transfer plan limit in bytes'),
      logDataTransferHardLimit: z
        .number()
        .optional()
        .describe('Log data transfer hard limit in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccountUsage();

    return {
      output: {
        accountId: account.id,
        name: account.name || '',
        planName: account.plan_name,
        logDataTransferUsed: account.log_data_transfer_used,
        logDataTransferPlanLimit: account.log_data_transfer_plan_limit,
        logDataTransferHardLimit: account.log_data_transfer_hard_limit
      },
      message: `Account **${account.name}** (plan: ${account.plan_name || 'unknown'}).`
    };
  })
  .build();
