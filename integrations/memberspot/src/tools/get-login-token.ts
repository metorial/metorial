import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLoginTokenTool = SlateTool.create(spec, {
  name: 'Generate Login Token',
  key: 'get_login_token',
  description: `Generate a single sign-on login token for a user. Returns a token that can be used to create a direct login link, allowing the user to access their account without entering credentials. Useful for sending personalized login links via email or messenger.`
})
  .input(
    z.object({
      userId: z.string().describe('User ID (uid) to generate a login token for')
    })
  )
  .output(
    z.object({
      loginToken: z.string().describe('Generated login token for SSO')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLoginToken(ctx.input.userId);
    let loginToken =
      typeof result === 'string'
        ? result
        : (result?.token ?? result?.loginToken ?? JSON.stringify(result));

    return {
      output: { loginToken },
      message: `Generated login token for user **${ctx.input.userId}**.`
    };
  })
  .build();
