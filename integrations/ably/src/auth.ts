import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Ably API key (for Pub/Sub REST API) or Control API access token'),
      authType: z
        .enum(['api_key', 'control_token'])
        .describe('The type of authentication being used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Ably API key in the format "appId.keyId:keyValue" (e.g. "I2E_JQ.OqUdfg:EVKVTCBlzLBP..."). Used for Pub/Sub REST API operations like publishing messages, retrieving history, and managing presence.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Control API Token',
    key: 'control_token',
    inputSchema: z.object({
      controlToken: z
        .string()
        .describe(
          'Ably Control API access token. Created in the Ably dashboard under "My Access Tokens". Used for managing apps, keys, rules, queues, and namespaces.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.controlToken,
          authType: 'control_token' as const
        }
      };
    }
  });
