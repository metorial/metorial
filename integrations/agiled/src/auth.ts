import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { normalizePublicApiBaseUrl, PublicClient } from './lib/public-client';

type AuthOutput = {
  token?: string;
  brand?: string;
  publicApiToken?: string;
  publicApiBaseUrl?: string;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().optional(),
      brand: z.string().optional(),
      publicApiToken: z.string().optional(),
      publicApiBaseUrl: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Brand',
    key: 'api_key_brand',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Agiled API key. Found under Profile → API Settings tab.'),
      brand: z
        .string()
        .describe(
          'Your Agiled brand/domain name (e.g. "my-company"). Found in the browser address bar or under Profile → Brands.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          brand: ctx.input.brand
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      let client = new Client(ctx.output);
      await client.listUsers(1, 1);

      return {
        profile: {
          id: ctx.output.brand,
          name: ctx.output.brand
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Public API Key',
    key: 'public_api_key',
    inputSchema: z.object({
      publicApiToken: z.string().describe('Public API key created in Settings → API.'),
      publicApiBaseUrl: z
        .string()
        .describe(
          'API base URL shown in Settings → API, such as https://api.agiled.ai/public/v1. This is the API URL, not your workspace or docs URL.'
        )
    }),
    getOutput: async ctx => {
      let publicApiBaseUrl = normalizePublicApiBaseUrl(ctx.input.publicApiBaseUrl);
      let client = new PublicClient({
        publicApiToken: ctx.input.publicApiToken,
        publicApiBaseUrl
      });
      await client.getCurrentUser();
      return { output: { publicApiToken: ctx.input.publicApiToken, publicApiBaseUrl } };
    },
    getProfile: async (ctx: { output: AuthOutput }) => {
      let context = await new PublicClient(ctx.output).getCurrentUser();
      let organizationId = context.organization_id;
      return {
        profile: {
          id: typeof organizationId === 'string' ? organizationId : undefined,
          name:
            typeof organizationId === 'string'
              ? `Agiled workspace ${organizationId}`
              : 'Agiled'
        }
      };
    }
  });
