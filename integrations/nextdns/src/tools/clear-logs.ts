import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let clearLogs = SlateTool.create(spec, {
  name: 'Clear DNS Logs',
  key: 'clear_logs',
  description: `Permanently clear all DNS query logs for a NextDNS profile. **This action is irreversible** — all log data will be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile whose logs should be cleared')
    })
  )
  .output(
    z.object({
      cleared: z.boolean().describe('Whether logs were successfully cleared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    await client.clearLogs(ctx.input.profileId);

    return {
      output: { cleared: true },
      message: `Cleared all DNS logs for profile \`${ctx.input.profileId}\`.`
    };
  })
  .build();
