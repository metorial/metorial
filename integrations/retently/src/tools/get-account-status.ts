import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStatus = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description:
    'Identify the authenticated Retently account and retrieve its current plan, survey credit balance, and usage counters.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z
      .object({
        account: z.any().describe('Authenticated account identity and timezone'),
        plan: z.any().optional().describe('Current plan and survey credit balance'),
        usage: z
          .any()
          .optional()
          .describe('Contact, feedback, outbox, queue, and suppression counts'),
        cache: z.any().optional().describe('Snapshot update metadata')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth.token).getAccountStatus();
    return {
      output,
      message: `Retrieved status for account **${output.account?.name ?? output.account?.id ?? 'Retently'}**.`
    };
  })
  .build();
