import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLoginTokenTool = SlateTool.create(spec, {
  name: 'Generate Login Token',
  key: 'get_login_token',
  description: `Generate a single sign-on login token for a user. Returns a token and, when provided, a direct login link. The token expires after one hour and can be used to sign in, allowing the user to access their account without entering credentials. Useful for sending personalized login links via email or messenger.`
})
  .input(
    z.object({
      userId: z
        .string()
        .describe('User ID (uid) from find_user or list_users to generate a login token for')
    })
  )
  .output(
    z.object({
      loginToken: z.string().describe('Generated login token for SSO; expires after one hour'),
      loginUrl: z.string().optional().describe('Provider-generated direct login URL'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLoginToken(ctx.input.userId);
    let loginToken =
      typeof result === 'string'
        ? result
        : isApiErrorRecord(result)
          ? (result.token ?? result.loginToken)
          : undefined;
    if (typeof loginToken !== 'string' || !loginToken.trim()) {
      throw createApiServiceError('Memberspot did not return a valid login token.');
    }
    let loginUrl =
      isApiErrorRecord(result) && typeof result.loginUrl === 'string'
        ? result.loginUrl
        : undefined;

    return {
      output: { loginToken, loginUrl, raw: result },
      message: `Generated login token for user **${ctx.input.userId}**.`
    };
  })
  .build();
