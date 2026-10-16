import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), email: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your AlgoDocs API key from account REST API settings')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Provide your AlgoDocs API key.');
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string; email?: string } }) => {
      let account = await new Client(ctx.output).getMe();
      return { profile: { name: account.fullName, email: account.email } };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth',
    key: 'basic_auth',
    inputSchema: z.object({
      email: z.string().describe('Your registered AlgoDocs email address'),
      token: z.string().describe('Your AlgoDocs API key from account REST API settings')
    }),
    getOutput: async ctx => {
      if (!ctx.input.email.trim() || !ctx.input.token.trim()) {
        throw createApiServiceError(
          'Provide your registered email address and AlgoDocs API key.'
        );
      }
      return { output: { token: ctx.input.token, email: ctx.input.email } };
    },
    getProfile: async (ctx: { output: { token: string; email?: string } }) => {
      let account = await new Client(ctx.output).getMe();
      return { profile: { name: account.fullName, email: account.email } };
    }
  });
