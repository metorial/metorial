import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenScheme: z
        .string()
        .describe(
          'The authorization scheme to use: "Bearer" for personal access tokens, "FlyV1" for tokens created with fly tokens create'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Fly.io API Token',
    key: 'fly_api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Fly.io API token (personal access token, org-scoped token, or app-scoped deploy token)'
        ),
      tokenScheme: z
        .enum(['Bearer', 'FlyV1'])
        .default('FlyV1')
        .describe(
          'Authorization scheme: use "Bearer" for personal access tokens from `fly auth token`, or "FlyV1" for tokens created with `fly tokens create`'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          tokenScheme: ctx.input.tokenScheme
        }
      };
    }
  });
