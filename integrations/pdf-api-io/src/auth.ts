import { SlateAuth } from 'slates';
import { z } from 'zod';
import { pdfApiIoServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string()
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();

      if (!token) {
        throw pdfApiIoServiceError('API token is required.');
      }

      return {
        output: {
          token
        }
      };
    }
  });
