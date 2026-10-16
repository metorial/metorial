import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { resolveBaseUrl } from './lib/settings';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Ninox Personal Access Token. Create one in Ninox Settings > Integrations > New API Key.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Ninox instance URL. Defaults to https://api.ninox.com for Public Cloud. For Private Cloud or On-Premises, enter your instance URL, including its port or path when needed.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          baseUrl: resolveBaseUrl(ctx.input.baseUrl)
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; baseUrl?: string };
      input: { token: string; baseUrl?: string };
    }) => {
      let baseUrl = ctx.output.baseUrl ?? ctx.input.baseUrl;
      // Legacy config is unavailable in auth callbacks; never guess its instance.
      if (baseUrl === undefined) {
        return { profile: {} };
      }
      let client = new Client({
        baseUrl: resolveBaseUrl(baseUrl),
        token: ctx.output.token
      });
      let teams = await client.listTeams();

      return {
        profile: {
          teamCount: teams.length
        }
      };
    }
  });
