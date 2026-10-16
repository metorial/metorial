import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { defaultBaseUrl, validateBaseUrl } from './lib/connection';
import { requireRecord, requireString } from './lib/response';

type AuthOutput = { token: string; authType: 'bot' | 'session'; baseUrl?: string };

let getProfile = async (ctx: { output: AuthOutput }) => {
  if (!ctx.output.baseUrl) return { profile: {} };
  let client = new Client({
    ...ctx.output,
    baseUrl: validateBaseUrl(ctx.output.baseUrl ?? defaultBaseUrl)
  });
  let user = requireRecord(await client.fetchSelf(), 'current user');
  return {
    profile: {
      id: requireString(user._id, 'the current user ID'),
      name: requireString(user.username, 'the current username')
    }
  };
};

let baseUrl = z
  .string()
  .optional()
  .describe(
    'Stoat API base URL for this connection. Defaults to https://api.stoat.chat; set this for a self-hosted instance.'
  );

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['bot', 'session']),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bot Token',
    key: 'bot_token',
    inputSchema: z.object({
      token: z.string().describe('Bot token from Stoat bot settings'),
      baseUrl
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        authType: 'bot' as const,
        baseUrl: validateBaseUrl(ctx.input.baseUrl ?? defaultBaseUrl)
      }
    }),
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Session Token',
    key: 'session_token',
    inputSchema: z.object({
      token: z.string().describe('Session token from Stoat user authentication'),
      baseUrl
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        authType: 'session' as const,
        baseUrl: validateBaseUrl(ctx.input.baseUrl ?? defaultBaseUrl)
      }
    }),
    getProfile
  });
