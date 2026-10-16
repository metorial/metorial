import { createApiServiceError, pickDefined, SlateAuth } from 'slates';
import { z } from 'zod';
import { FinmeiClient, optionalString, requireId, requireRecord } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Finmei API token. Go to Settings → Integrations in the Finmei app to generate one.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim())
        throw createApiServiceError('A Finmei API token is required.');
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let result = await new FinmeiClient(ctx.output.token).getProfile();
      let envelope = requireRecord(result, 'profile');
      let profile = requireRecord('data' in envelope ? envelope.data : envelope, 'profile');
      return {
        profile: pickDefined({
          id: requireId(profile.business_id ?? profile.id, 'business ID'),
          name: optionalString(
            profile.business_title ?? profile.name ?? profile.company_name,
            'business title'
          ),
          email: optionalString(profile.email, 'profile email')
        })
      };
    }
  });
