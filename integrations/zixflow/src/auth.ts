import { SlateAuth } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from './lib/client';
import { providerRecords, requireInput } from './lib/response';

export let auth = SlateAuth.create()
  .output(
    z
      .object({
        token: z.string()
      })
      .passthrough()
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
      requireInput(ctx.input.apiKey, 'API key');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = new ZixflowClient({ token: ctx.output.token });
      let response = await client.getWorkspaceMembers();
      let workspace = providerRecords(response.data).find(
        member => typeof member.workspaceId === 'string'
      );

      return {
        profile: {
          id: workspace?.workspaceId,
          name: 'Zixflow workspace'
        }
      };
    }
  });
