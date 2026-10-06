import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, required } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Pulumi personal, organization or team access token. Create one in your Pulumi Cloud account settings.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS API origin for your self-hosted Pulumi installation. Defaults to https://api.pulumi.com; omit paths, query strings, fragments and embedded credentials.'
        )
    }),
    getOutput: async ctx => {
      const token = required(ctx.input.token, 'Pulumi access token');
      const baseUrl = connectionApiBaseUrl(ctx.input, ctx.config);
      await new Client({ token, baseUrl }).getCurrentUser();
      return { output: { token, baseUrl } };
    },
    getProfile: async (ctx: {
      output: { token: string; baseUrl?: string };
      input: { token: string; baseUrl?: string };
      config?: unknown;
    }) => {
      const user = await new Client({
        token: ctx.output.token,
        baseUrl: connectionApiBaseUrl(
          { baseUrl: ctx.output.baseUrl ?? ctx.input.baseUrl },
          ctx.config
        )
      }).getCurrentUser();
      return {
        profile: {
          id: user.id,
          name: user.name || user.githubLogin,
          email: user.email,
          imageUrl: user.avatarUrl
        }
      };
    }
  });
