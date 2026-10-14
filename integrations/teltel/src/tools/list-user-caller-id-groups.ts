import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let listUserCallerIdGroupsTool = SlateTool.create(spec, {
  name: 'List User Caller ID Groups',
  key: 'list_user_caller_id_groups',
  description:
    'Discover caller ID groups and phone numbers available to a TelTel user. Call list_users first to discover the user ID.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ userId: z.string().describe('User ID from list_users') }))
  .output(
    z.object({
      groups: z
        .any()
        .describe('Caller ID groups, assigned numbers, and related caller ID information')
    })
  )
  .handleInvocation(async ctx => {
    let response = await new TelTelClient(ctx.auth.token).getUserCallerIdGroups(
      ctx.input.userId
    );
    return {
      output: { groups: response?.data ?? response },
      message: `Retrieved caller ID groups for user **${ctx.input.userId}**.`
    };
  })
  .build();
