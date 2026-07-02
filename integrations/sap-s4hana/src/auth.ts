import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import type { SapAuthMethod, SapAuthOutput } from './lib/client';

let authInputSchema = z.object({
  authMethod: z
    .enum(['basic', 'bearer', 'apiHubKey'])
    .describe(
      'Authentication mode. Use basic for SAP communication users, bearer for a pre-issued OAuth/access token, or apiHubKey for the SAP Business Accelerator Hub sandbox.'
    ),
  username: z
    .string()
    .optional()
    .describe('SAP communication user. Required when authMethod is basic.'),
  password: z
    .string()
    .optional()
    .describe('SAP communication user password. Required when authMethod is basic.'),
  bearerToken: z
    .string()
    .optional()
    .describe('Pre-issued SAP bearer token. Required when authMethod is bearer.'),
  apiHubKey: z
    .string()
    .optional()
    .describe('SAP Business Accelerator Hub API key. Required when authMethod is apiHubKey.')
});

type SapAuthInput = z.infer<typeof authInputSchema>;

let requireSecret = (value: string | undefined, message: string) => {
  if (!value) throw createApiServiceError(message, { reason: 'sap_s4hana_validation_error' });
  return value;
};

let buildAuthOutput = (input: SapAuthInput): SapAuthOutput => {
  if (input.authMethod === 'basic') {
    let username = requireSecret(input.username, 'username is required for SAP basic auth.');
    let password = requireSecret(input.password, 'password is required for SAP basic auth.');
    return {
      authMethod: 'basic',
      token: Buffer.from(`${username}:${password}`).toString('base64')
    };
  }

  if (input.authMethod === 'bearer') {
    return {
      authMethod: 'bearer',
      token: requireSecret(input.bearerToken, 'bearerToken is required for SAP bearer auth.')
    };
  }

  return {
    authMethod: 'apiHubKey',
    apiKey: requireSecret(input.apiHubKey, 'apiHubKey is required for SAP API Hub auth.')
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      authMethod: z
        .enum(['basic', 'bearer', 'apiHubKey'])
        .describe('Authentication mode used for SAP S/4HANA API calls.'),
      token: z
        .string()
        .optional()
        .describe('Opaque basic or bearer credential material for SAP API calls.'),
      apiKey: z
        .string()
        .optional()
        .describe('SAP Business Accelerator Hub API key for sandbox calls.')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'SAP S/4HANA Credentials',
    key: 'sap_credentials',
    docs: [
      {
        type: 'docs.auth.custom',
        name: 'SAP S/4HANA APIs',
        url: 'https://api.sap.com/products/SAPS4HANACloud/apis/all'
      }
    ],
    inputSchema: authInputSchema,
    getOutput: async (ctx: { input: SapAuthInput }) => ({
      output: buildAuthOutput(ctx.input)
    }),
    getProfile: async (ctx: { output: SapAuthOutput; config?: any }) => {
      if (!ctx.config?.baseUrl) {
        throw createApiServiceError(
          'SAP S/4HANA baseUrl config is required before validating credentials.',
          { reason: 'sap_s4hana_validation_error' }
        );
      }

      let { SapS4HanaClient } = await import('./lib/client');
      let client = new SapS4HanaClient({
        auth: ctx.output,
        config: ctx.config
      });

      await client.getMetadata('API_BUSINESS_PARTNER');

      return {
        profile: {
          id: client.profileId,
          name: `SAP S/4HANA ${client.profileId}`,
          authMethod: ctx.output.authMethod as SapAuthMethod,
          baseUrl: client.normalizedBaseUrl,
          sandboxMode: Boolean(ctx.config?.sandboxMode)
        }
      };
    }
  });
