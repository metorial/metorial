import { SlateAuth } from 'slates';
import { z } from 'zod';
import { apiEndpoints, Client, requireValue } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Service key or IAM access token for management APIs'),
      ingestionToken: z.string().optional().describe('Separate log ingestion key'),
      authType: z
        .enum(['service_key', 'access_token'])
        .optional()
        .describe('Management credential type'),
      apiEndpoint: z.enum(apiEndpoints).optional().describe('Log Analysis API host')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Key',
    key: 'service_key',
    inputSchema: z.object({
      serviceKey: z
        .string()
        .describe(
          'Existing service key from the LogDNA or Mezmo API Keys settings. New service keys are deprecated; use IAM Access Token for new connections.'
        ),
      ingestionKey: z
        .string()
        .optional()
        .describe('Separate ingestion key, required only for sending logs'),
      apiEndpoint: z
        .enum(apiEndpoints)
        .optional()
        .describe(
          'API host for this account; defaults to api.logdna.com for existing service-key connections'
        )
    }),
    getOutput: async ctx => {
      requireValue(ctx.input.serviceKey, 'Service key');
      if (ctx.input.ingestionKey !== undefined)
        requireValue(ctx.input.ingestionKey, 'Ingestion key');
      const apiEndpoint = ctx.input.apiEndpoint ?? apiEndpoints[0];
      await new Client({ serviceKey: ctx.input.serviceKey, apiEndpoint }).listViews();
      return {
        output: {
          token: ctx.input.serviceKey,
          ingestionToken: ctx.input.ingestionKey,
          authType: 'service_key' as const,
          apiEndpoint
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'IAM Access Token',
    key: 'access_token',
    inputSchema: z.object({
      accessToken: z
        .string()
        .describe(
          'IAM access token authorized for the required Log Analysis configuration and export operations'
        ),
      ingestionKey: z
        .string()
        .optional()
        .describe('Separate ingestion key; IAM management tokens are not ingestion keys'),
      apiEndpoint: z
        .enum(apiEndpoints)
        .optional()
        .describe('Documented API host; defaults to api.mezmo.com')
    }),
    getOutput: async ctx => {
      requireValue(ctx.input.accessToken, 'IAM access token');
      if (ctx.input.ingestionKey !== undefined)
        requireValue(ctx.input.ingestionKey, 'Ingestion key');
      const apiEndpoint = ctx.input.apiEndpoint ?? apiEndpoints[1];
      await new Client({
        serviceKey: ctx.input.accessToken,
        apiEndpoint,
        authType: 'access_token'
      }).listViews();
      return {
        output: {
          token: ctx.input.accessToken,
          ingestionToken: ctx.input.ingestionKey,
          authType: 'access_token' as const,
          apiEndpoint
        }
      };
    }
  });
