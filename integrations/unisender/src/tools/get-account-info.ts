import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve information about the current Unisender account, including account settings, login, email, and account status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountInfo: z
        .any()
        .describe('Account information including login, email, and account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let info = await client.getUserInfo();

    return {
      output: { accountInfo: info },
      message: `Retrieved account information`
    };
  })
  .build();
