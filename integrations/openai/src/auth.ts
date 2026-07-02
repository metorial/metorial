import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { openAIApiError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OpenAI API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().min(1).describe('Your OpenAI API key (starts with sk-)')
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
        baseURL: 'https://api.openai.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      try {
        await axios.get('/models');
      } catch (error) {
        throw openAIApiError(error, 'profile validation');
      }

      return {
        profile: {
          name: 'OpenAI API key'
        }
      };
    }
  });
