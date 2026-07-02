import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { docparserApiError, docparserServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Docparser secret API key, found at https://app.docparser.com/myaccount/api'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      try {
        let client = new Client({ token: ctx.output.token });
        let response = await client.ping();

        if (response.msg === 'pong') {
          return {
            profile: {
              name: 'Docparser Account'
            }
          };
        }

        throw docparserServiceError('Invalid Docparser API key.');
      } catch (error) {
        throw docparserApiError(error, 'authentication check');
      }
    }
  });
