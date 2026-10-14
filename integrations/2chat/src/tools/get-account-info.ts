import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description:
    'Retrieve the account information available to your API key and verify your connection to 2Chat.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      info: z.record(z.string(), z.unknown()).describe('Account information returned by 2Chat')
    })
  )
  .handleInvocation(async ctx => {
    let info = await new TwoChatClient({ token: ctx.auth.token }).getAccountInfo();
    return { output: { info }, message: 'Retrieved 2Chat account information.' };
  })
  .build();
