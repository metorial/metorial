import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Zixflow API key. Found in Settings > Workspace Settings > Developer > API Keys.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.zixflow.com/api/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/workspace-member');
      let members = response.data?.data;
      let firstMember = Array.isArray(members) && members.length > 0 ? members[0] : null;

      return {
        profile: {
          id: firstMember?.userId ?? undefined,
          name: firstMember?.fullName ?? undefined,
          email: firstMember?.email ?? undefined,
          imageUrl: firstMember?.avatar ?? undefined
        }
      };
    }
  });
