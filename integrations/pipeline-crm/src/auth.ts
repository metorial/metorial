import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      appKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & App Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Pipeline CRM API Key (user-level). Found in Settings > API > API Keys.'
        ),
      appKey: z
        .string()
        .describe(
          'Your Pipeline CRM App Key (application-level). Found in Settings > API > API Integrations.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          appKey: ctx.input.appKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; appKey: string };
      input: { apiKey: string; appKey: string };
    }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://api.pipelinecrm.com/api/v3'
      });

      let response = await axiosInstance.get('/profile.json', {
        params: {
          api_key: ctx.output.token,
          app_key: ctx.output.appKey
        }
      });

      let profile = response.data;

      return {
        profile: {
          id: String(profile.id ?? ''),
          email: profile.email ?? '',
          name:
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
            profile.email ||
            ''
        }
      };
    }
  });
