import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, regionFor, required } from './lib/client';

const region = z
  .enum(['us', 'eu'])
  .optional()
  .describe('Activations region: us or eu. Defaults to us.');
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      region: z.enum(['us', 'eu']).optional(),
      credentialType: z.enum(['workspace', 'personal']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Workspace API Key',
    key: 'workspace_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Workspace API key from Activations workspace API Access settings.'),
      region
    }),
    getOutput: async ctx => {
      const token = required(ctx.input.token, 'Workspace API key');
      const resolvedRegion = regionFor(ctx.input, ctx.config);
      await new Client({ token, region: resolvedRegion }).getWorkspace();
      return {
        output: { token, region: resolvedRegion, credentialType: 'workspace' as const }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; region?: 'us' | 'eu' };
      input: { region?: 'us' | 'eu' };
      config?: unknown;
    }) => {
      const workspace = await new Client({
        token: ctx.output.token,
        region: regionFor({ region: ctx.output.region ?? ctx.input.region }, ctx.config)
      }).getWorkspace();
      return { profile: { id: String(workspace.workspaceId), name: workspace.name } };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Activations personal access token, distinct from core Fivetran API credentials. Workspace operations need an explicit workspaceId and owner/admin permission to retrieve its existing key.'
        ),
      region
    }),
    getOutput: async ctx => {
      const token = required(ctx.input.token, 'Personal access token');
      const resolvedRegion = regionFor(ctx.input, ctx.config);
      await new Client({ token, region: resolvedRegion }).listWorkspaces({ perPage: 1 });
      return {
        output: { token, region: resolvedRegion, credentialType: 'personal' as const }
      };
    }
  });
