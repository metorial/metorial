import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, type ClientConfig } from './lib/client';

let twitterCredentials = {
  twitterApiKey: z
    .string()
    .optional()
    .describe('X Developer App OAuth 1.0a API key, required for X operations'),
  twitterApiSecret: z
    .string()
    .optional()
    .describe('X Developer App OAuth 1.0a API secret, required with the X API key')
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Ayrshare API Key (Bearer token)'),
      ...twitterCredentials
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Ayrshare API Key found in the Dashboard under your Primary Profile'),
      ...twitterCredentials
    }),
    getOutput: async ctx => {
      // Validate the optional X credential pair before storing the connection.
      new Client({ token: ctx.input.apiKey, ...ctx.input });
      return {
        output: {
          token: ctx.input.apiKey,
          twitterApiKey: ctx.input.twitterApiKey,
          twitterApiSecret: ctx.input.twitterApiSecret
        }
      };
    },
    getProfile: async (ctx: { output: ClientConfig }) => {
      let data = await new Client(ctx.output).getUser();
      return {
        profile: {
          id: data.refId,
          name: data.title || data.displayTitle || data.email || 'Ayrshare account',
          email: data.email
        }
      };
    }
  });
