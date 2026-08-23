import { SlateAuth } from 'slates';
import { z } from 'zod';
import { LAUNCHDARKLY_API_BASE_URLS, LaunchDarklyClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Access Token',
    key: 'api_access_token',

    inputSchema: z.object({
      token: z.string().describe('LaunchDarkly API access token (personal or service token)'),
      server: z
        .enum(['commercial', 'eu', 'federal'])
        .optional()
        .describe(
          'LaunchDarkly service region. Use "eu" for EU data residency or "federal" for the US federal environment. Defaults to "commercial".'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          baseUrl: LAUNCHDARKLY_API_BASE_URLS[ctx.input.server ?? 'commercial']
        }
      };
    },

    getProfile: async (ctx: any) => {
      let client = new LaunchDarklyClient(ctx.output.token, ctx.output.baseUrl);
      let caller = await client.getCallerIdentity();
      let member: any;

      if (caller.memberId) {
        try {
          member = await client.getMember('me');
        } catch {
          // Restricted tokens may identify the caller without permission to read members.
        }
      }

      return {
        profile: {
          id: caller.memberId ?? caller.tokenId ?? caller.accountId,
          email: member?.email,
          name: member?.firstName
            ? `${member.firstName} ${member.lastName ?? ''}`.trim()
            : caller.tokenName
        }
      };
    }
  });
