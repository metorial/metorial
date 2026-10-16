import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

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
      token: z.string().describe('ImgBB API key obtained from api.imgbb.com')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter your ImgBB API key.', {
          reason: 'imgbb_missing_api_key'
        });
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
