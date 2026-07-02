import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axiosInstance = createAxios({
  baseURL: 'https://api.docupilot.app'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      workspaceId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key + Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('API Key generated from Settings > API Settings'),
      apiSecret: z.string().describe('API Secret provided at key creation time'),
      workspaceId: z
        .string()
        .describe('Workspace ID found on the Workspace details page in Settings')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.apiKey}:${ctx.input.apiSecret}`);
      return {
        output: {
          token: encoded,
          workspaceId: ctx.input.workspaceId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; workspaceId: string };
      input: { apiKey: string; apiSecret: string; workspaceId: string };
    }) => {
      let response = await axiosInstance.get('/dashboard/accounts/v2/users/me/', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'X-Workspace': ctx.output.workspaceId
        }
      });

      let user = response.data;
      return {
        profile: {
          id: String(user.id ?? ''),
          email: user.email ?? '',
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || ''
        }
      };
    }
  });
