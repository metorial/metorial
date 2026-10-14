import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
      token: z
        .string()
        .describe(
          'DatoCMS API token. Obtain from Project Settings > API Tokens in your DatoCMS dashboard.'
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
      let site = await new Client({ token: ctx.output.token }).getSite();
      if (!site?.id || !site.name) {
        throw createApiServiceError(
          'DatoCMS did not return a project identity. Check that the API token has Content Management API access.'
        );
      }
      return {
        profile: {
          id: site.id,
          name: site.name
        }
      };
    }
  });
