import { SlateAuth } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountName: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .min(1)
        .describe(
          'AppVeyor API token from https://ci.appveyor.com/api-keys. Supports account-level (v1) and user-level (v2) tokens.'
        ),
      accountName: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Account name shown in your AppVeyor account URL. Required for a user-level (v2) API key; omit for an account-level (v1) key.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.apiToken, accountName: ctx.input.accountName }
    }),
    getProfile: async (ctx: { output: { token: string; accountName?: string } }) => {
      let client = new AppVeyorClient(ctx.output);
      let projects = await client.listProjects();
      let project = projects[0];
      let accountName =
        ctx.output.accountName ??
        (typeof project?.accountName === 'string' ? project.accountName : undefined);
      return {
        profile: {
          id: typeof project?.accountId === 'number' ? String(project.accountId) : accountName,
          name: accountName ?? 'AppVeyor account'
        }
      };
    }
  });
