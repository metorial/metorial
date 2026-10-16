import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieves the authenticated StoreRocket user profile from the documented V2 user endpoint. Returns the complete provider response, including the user ID, name, email, and company when returned.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z.any().describe('Complete authenticated user-profile response')
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
