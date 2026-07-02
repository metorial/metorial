import { SlateAuth } from 'slates';
import { z } from 'zod';
import { normalizeAbsoluteUrl, requestIfsAccessToken } from './lib/oauth';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenType: z.string().optional(),
      expiresAt: z.string().optional(),
      refreshToken: z.string().optional(),
      tokenUrl: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      scope: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth2 Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      tokenUrl: z.string().describe('IFS IAM OAuth2 token endpoint URL for the tenant.'),
      clientId: z.string().describe('IFS IAM client ID for the service integration.'),
      clientSecret: z.string().describe('IFS IAM client secret for the service integration.'),
      scope: z
        .string()
        .optional()
        .describe('Optional OAuth scope string required by the IFS IAM client.')
    }),
    getOutput: async ctx => {
      let tokenUrl = normalizeAbsoluteUrl(ctx.input.tokenUrl, 'IFS token URL');
      let token = await requestIfsAccessToken({
        tokenUrl,
        clientId: ctx.input.clientId,
        clientSecret: ctx.input.clientSecret,
        scope: ctx.input.scope
      });

      return {
        output: {
          ...token,
          tokenUrl,
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret,
          scope: token.scope ?? ctx.input.scope
        }
      };
    },
    getProfile: async (ctx: {
      output: {
        clientId: string;
        tokenUrl: string;
      };
    }) => {
      return {
        profile: {
          id: ctx.output.clientId,
          name: 'IFS IAM Client'
        }
      };
    }
  });
