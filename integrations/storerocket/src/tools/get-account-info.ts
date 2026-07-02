import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieves the authenticated StoreRocket account information, including account details, plan information, and locator settings. Use this to verify account configuration, check the current plan, or review store locator settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z
        .any()
        .describe('Account details including plan information and locator settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getUserInfo();

    return {
      output: {
        account: result
      },
      message: `Successfully retrieved StoreRocket account information.`
    };
  })
  .build();
