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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your CATS API key. Create one from Administration settings in CATS.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await new Client({ token: ctx.output.token }).getSite();
      if (typeof data?.subdomain !== 'string' || !data.subdomain.trim()) {
        throw createApiServiceError('CATS returned a site without its subdomain.');
      }
      return {
        profile: {
          id: data.subdomain,
          name: data.subdomain
        }
      };
    }
  });
