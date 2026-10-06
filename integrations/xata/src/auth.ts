import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { rejectRetiredLite } from './lib/client';
import { XataPlatformClient } from './lib/platform';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
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
          'Current Xata API key from console.xata.io with org:read and the project/branch permissions needed for the selected operations. Retired Xata Lite keys are not current-platform credentials.'
        )
    }),
    getOutput: async ctx => {
      new XataPlatformClient({ token: ctx.input.apiKey });
      return { output: { token: ctx.input.apiKey } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const result = await new XataPlatformClient({
        token: ctx.output.token
      }).listOrganizations();
      const organizations = [...result.organizations].sort((a, b) => a.id.localeCompare(b.id));
      if (!organizations.length)
        throw createApiServiceError(
          'No current Xata organizations are accessible. Check the API key org:read scope and organization membership.'
        );
      return {
        profile: {
          id: organizations.map(value => value.id).join(','),
          name: `Xata: ${organizations.map(value => value.name).join(', ')}`
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (Xata Lite retired)',
    key: 'oauth',
    scopes: [
      {
        title: 'Retired Lite Admin Access',
        description:
          'Historical Xata Lite scope; its OAuth flow is retired. Connect using a current Xata API key instead.',
        scope: 'admin:all'
      }
    ],
    getAuthorizationUrl: async () => rejectRetiredLite(),
    handleCallback: async () => rejectRetiredLite(),
    handleTokenRefresh: async () => rejectRetiredLite(),
    getProfile: async () => rejectRetiredLite()
  });
