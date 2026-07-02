import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountDetails = SlateTool.create(spec, {
  name: 'Get Account Details',
  key: 'get_account_details',
  description: `Retrieve UptimeRobot account details including email, monitor limits, default check interval, and current monitor counts by status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      monitorLimit: z.number().describe('Maximum number of monitors allowed'),
      monitorInterval: z.number().describe('Default check interval in seconds'),
      upMonitors: z.number().describe('Number of monitors currently up'),
      downMonitors: z.number().describe('Number of monitors currently down'),
      pausedMonitors: z.number().describe('Number of monitors currently paused')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccountDetails();

    return {
      output: {
        email: account.email,
        monitorLimit: account.monitor_limit,
        monitorInterval: account.monitor_interval,
        upMonitors: account.up_monitors,
        downMonitors: account.down_monitors,
        pausedMonitors: account.paused_monitors
      },
      message: `Account **${account.email}**: ${account.up_monitors} up, ${account.down_monitors} down, ${account.paused_monitors} paused monitors (limit: ${account.monitor_limit}).`
    };
  })
  .build();
