import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { type BeeminderAuth, BeeminderClient } from './lib/client';
import { mapUser, responseRecord } from './lib/schemas';

let getProfile = async (ctx: { output: BeeminderAuth }) => {
  let raw = await new BeeminderClient(ctx.output).getUser();
  let user = mapUser(raw);
  let data = responseRecord(raw);
  return {
    profile: {
      id: user.username,
      name: user.username,
      ...(typeof data.email === 'string' ? { email: data.email } : {})
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string(),
      authType: z.enum(['oauth', 'personal_token']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'token',
        state: ctx.state
      });
      return { url: `https://www.beeminder.com/apps/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let token = ctx.callbackParams?.access_token || ctx.code;
      if (!token?.trim())
        throw createApiServiceError('Beeminder did not return an OAuth access token.');
      let output: BeeminderAuth = { token, username: 'me', authType: 'oauth' };
      let user = mapUser(await new BeeminderClient(output).getUser());
      return { output: { ...output, username: user.username } };
    },
    // Beeminder documents direct access-token authorization, without expiry or refresh tokens.
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Auth Token',
    key: 'personal_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal auth token from https://www.beeminder.com/api/v1/auth_token.json'),
      username: z.string().describe('Your Beeminder username')
    }),
    getOutput: async ctx => {
      let output: BeeminderAuth = {
        token: ctx.input.token,
        username: ctx.input.username,
        authType: 'personal_token'
      };
      new BeeminderClient(output);
      return { output };
    },
    getProfile
  });
