import { SlateAuth } from 'slates';
import { z } from 'zod';
import { getDocumentsCredentials } from './lib/documents-client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      providerKind: z.enum(['identitycheck', 'resistant_documents']).optional(),
      documentsBaseUrl: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'IdentityCheck API Key (Legacy)',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'IdentityCheck API key generated from the IdentityCheck dashboard (requires Professional plan or above)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          providerKind: 'identitycheck' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Resistant Documents Client Credentials',
    key: 'documents_client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('Client ID provisioned by Resistant AI for your tenant'),
      clientSecret: z.string().describe('Client secret provisioned by Resistant AI'),
      environment: z
        .enum(['eu-1', 'us-1', 'ca-1', 'ap-2', 'ap-3', 'testing'])
        .describe('Deployment cell for your credentials. Testing is available in EU only.')
    }),
    getOutput: async ctx => ({
      output: await getDocumentsCredentials(ctx.input),
      scopes: ['submissions.read', 'submissions.write']
    }),
    handleTokenRefresh: async (ctx: {
      input: Parameters<typeof getDocumentsCredentials>[0];
    }) => ({
      output: await getDocumentsCredentials(ctx.input)
    })
  });
