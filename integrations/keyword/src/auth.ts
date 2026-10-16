import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { getAttributes, getResource, requireText } from './lib/response';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Keyword.com API token. Found under Settings > Account tab at https://app.keyword.com/settings/account'
        )
    }),
    getOutput: async ctx => {
      requireText(ctx.input.token, 'API token');
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let resource = getResource(
        await new Client({ token: ctx.output.token }).getCurrentUser()
      );
      let attributes = getAttributes(resource);
      requireText(resource.id, 'Account identifier returned by Keyword.com');
      requireText(attributes.name, 'Account name returned by Keyword.com');
      return { profile: { id: resource.id, name: attributes.name } };
    }
  });
