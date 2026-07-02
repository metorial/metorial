import { SlateAuth } from '@slates/provider';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Auth Token or API Key Secret used as the password for HTTP Basic Auth'),
      apiKeySid: z
        .string()
        .optional()
        .describe(
          'API Key SID used as the username (if using API Key auth instead of Account SID)'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Auth Token',
    key: 'auth_token',
    inputSchema: z.object({
      authToken: z
        .string()
        .describe(
          'Your Twilio Auth Token. Found in the Twilio Console alongside your Account SID.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.authToken
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKeySid: z.string().describe('Your Twilio API Key SID (starts with SK).'),
      apiKeySecret: z.string().describe('Your Twilio API Key Secret.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKeySecret,
          apiKeySid: ctx.input.apiKeySid
        }
      };
    }
  });
