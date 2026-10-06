import { SlateAuth } from 'slates';
import { z } from 'zod';
import { WorkatoClient } from './lib/client';
import { workspace } from './lib/mappers';
import { dataCenters } from './lib/urls';
export const auth = SlateAuth.create()
  .output(z.object({ token: z.string(), dataCenter: z.enum(dataCenters).optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Client Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Workato Developer API client Bearer token with the required endpoint privileges and project scope.'
        ),
      dataCenter: z
        .enum(dataCenters)
        .default('us')
        .describe(
          'Data center of the workspace that issued this token. Private workspaces require separate provider guidance.'
        )
    }),
    getOutput: async ctx => {
      new WorkatoClient({ token: ctx.input.token, dataCenter: ctx.input.dataCenter });
      return { output: { token: ctx.input.token, dataCenter: ctx.input.dataCenter } };
    },
    getProfile: async (ctx: {
      output: { token: string; dataCenter?: string };
      input: { token: string; dataCenter?: string };
    }) => {
      const info = workspace(
        await new WorkatoClient({
          token: ctx.output.token,
          dataCenter: ctx.output.dataCenter ?? ctx.input.dataCenter ?? 'us'
        }).getWorkspaceInfo()
      );
      return {
        profile: {
          id: String(info.workspaceId),
          name: info.teamName ?? info.name,
          email: info.email ?? undefined
        }
      };
    }
  });
