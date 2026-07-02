import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStatusTool = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description: `Retrieve the current Kraken.io account status including plan name, quota usage, and account active status. All quota values are returned in bytes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      active: z.boolean().describe('Whether the account is currently active'),
      planName: z.string().describe('Name of the current subscription plan'),
      quotaTotal: z.number().describe('Total quota allocation in bytes'),
      quotaUsed: z.number().describe('Quota consumed in bytes'),
      quotaRemaining: z.number().describe('Available quota remaining in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      sandbox: ctx.config.sandbox
    });

    let status = await client.getUserStatus();

    if (!status.success) {
      throw new Error('Failed to retrieve account status');
    }

    let usedPercent =
      status.quota_total > 0
        ? ((status.quota_used / status.quota_total) * 100).toFixed(1)
        : '0';

    let remainingMb = (status.quota_remaining / (1024 * 1024)).toFixed(1);

    return {
      output: {
        active: status.active,
        planName: status.plan_name,
        quotaTotal: status.quota_total,
        quotaUsed: status.quota_used,
        quotaRemaining: status.quota_remaining
      },
      message: `Account **${status.plan_name}** is ${status.active ? 'active' : 'inactive'}. Quota: **${usedPercent}%** used, **${remainingMb} MB** remaining.`
    };
  })
  .build();
