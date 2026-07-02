import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserInfo = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Retrieve account information for the authenticated Promptmate.io user. Useful for verifying credentials and checking account status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).describe('User account details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getUserInfo();

    return {
      output: { user },
      message: `Retrieved user information.`
    };
  })
  .build();
