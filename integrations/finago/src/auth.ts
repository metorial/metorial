import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  exchangeClientCredentialsToken,
  FINAGO_DEFAULT_BASE_URL,
  type FinagoAuthOutput,
  FinagoClient
} from './lib/client';
import { finagoApiError, finagoServiceError } from './lib/errors';
import { getString, isRecord } from './lib/records';

let inputSchema = z.object({
  clientId: z.string().describe('Finago OAuth2 Application ID / Client ID.'),
  clientSecret: z.string().describe('Finago OAuth2 Client Secret.'),
  organizationId: z
    .string()
    .describe(
      'Finago Organization ID used as login_organization when requesting a client-credentials access token.'
    ),
  baseUrl: z
    .string()
    .optional()
    .describe(`Optional Finago REST API base URL. Defaults to ${FINAGO_DEFAULT_BASE_URL}.`)
});

let resolveProfileName = (profile: unknown, organization: unknown) => {
  let firstName = getString(profile, 'firstName');
  let lastName = getString(profile, 'lastName');
  let fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || getString(organization, 'name') || 'Finago organization';
};

let profileFromOutput = async (output: FinagoAuthOutput) => {
  let client = new FinagoClient({ token: output.token, baseUrl: output.baseUrl });

  try {
    let [profile, organization] = await Promise.all([
      client.get('/me', undefined, 'read profile'),
      client.get('/organization', undefined, 'read organization')
    ]);

    return {
      profile: {
        id: getString(profile, 'id') ?? getString(organization, 'id') ?? output.organizationId,
        name: resolveProfileName(profile, organization),
        email: getString(organization, 'email'),
        organizationId: output.organizationId,
        organizationName: getString(organization, 'name'),
        profile: isRecord(profile) ? profile : undefined,
        organization: isRecord(organization) ? organization : undefined
      }
    };
  } catch (error) {
    throw finagoApiError(error, 'profile lookup');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      expiresAt: z.string().optional(),
      organizationId: z.string(),
      baseUrl: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Finago REST authentication',
        url: 'https://rest-api.developer.24sevenoffice.com/doc/v1/topic/topic-authentication'
      }
    ],
    inputSchema,
    getOutput: async ctx => {
      if (!ctx.input.clientId.trim()) {
        throw finagoServiceError('clientId is required.');
      }
      if (!ctx.input.clientSecret.trim()) {
        throw finagoServiceError('clientSecret is required.');
      }
      if (!ctx.input.organizationId.trim()) {
        throw finagoServiceError('organizationId is required.');
      }

      return await exchangeClientCredentialsToken({
        clientId: ctx.input.clientId,
        clientSecret: ctx.input.clientSecret,
        organizationId: ctx.input.organizationId,
        baseUrl: ctx.input.baseUrl
      });
    },
    handleTokenRefresh: async (ctx: any) =>
      await exchangeClientCredentialsToken({
        clientId: ctx.input.clientId,
        clientSecret: ctx.input.clientSecret,
        organizationId: ctx.input.organizationId,
        baseUrl: ctx.input.baseUrl
      }),
    getProfile: async (ctx: { output: FinagoAuthOutput }) =>
      await profileFromOutput(ctx.output)
  });
