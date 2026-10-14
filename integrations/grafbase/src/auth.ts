import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Grafbase personal access token'),
      apiUrl: z.string().optional().describe('Grafbase GraphQL API endpoint')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Grafbase personal access token, created from account settings > access tokens. Organization tokens are intended for Gateway telemetry and graph delivery.'
        ),
      apiUrl: z
        .string()
        .optional()
        .describe(
          'Grafbase GraphQL API URL. Defaults to https://api.grafbase.com/graphql. Set this for a self-hosted Enterprise Platform instance.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, apiUrl: ctx.input.apiUrl }
    }),
    getProfile: async (ctx: { output: { token: string; apiUrl?: string } }) => {
      let client = new Client({ token: ctx.output.token, apiUrl: ctx.output.apiUrl });
      let user = await client.getViewer(1);
      return { profile: { id: user.id, name: user.name } };
    }
  });
