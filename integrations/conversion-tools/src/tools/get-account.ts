import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieves the authenticated user's account information, including the email address associated with the API token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Email address of the authenticated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let userInfo = await client.getUserInfo();

    return {
      output: {
        email: userInfo.email
      },
      message: `Authenticated as **${userInfo.email}**.`
    };
  })
  .build();
