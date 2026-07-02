import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { geminiApiError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Gemini API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your Gemini API key from Google AI Studio')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        headers: {
          'x-goog-api-key': ctx.output.token
        }
      });

      try {
        await axios.get('/models', { params: { pageSize: 1 } });
      } catch (error) {
        throw geminiApiError(error, 'validate API key');
      }

      return {
        profile: {
          id: 'gemini-user',
          name: 'Gemini API User'
        }
      };
    }
  });
