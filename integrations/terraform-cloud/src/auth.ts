import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { normalizeBaseUrl } from './lib/contracts';
import { mapUser } from './lib/mappers';
export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'HCP Terraform user, team/group or organization API token. Account discovery identifies service tokens; organization tokens cannot queue Terraform runs.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS API URL ending in /api/v2. Defaults to https://app.terraform.io/api/v2; use https://app.eu.terraform.io/api/v2 for HCP Europe or your Terraform Enterprise API URL.'
        )
    }),
    getOutput: async ctx => {
      const baseUrl = normalizeBaseUrl(ctx.input.baseUrl);
      new Client({ token: ctx.input.token, baseUrl });
      return { output: { token: ctx.input.token, baseUrl } };
    },
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      const user = mapUser((await new Client(ctx.output).getAccountDetails()).data);
      return {
        profile: {
          id: user.authenticatedResourceId || user.userId,
          name: user.username || user.authenticatedResourceId || user.userId,
          email: user.email || undefined,
          imageUrl: user.avatarUrl || undefined
        }
      };
    }
  });
