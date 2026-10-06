import { createGoogleOAuth } from '@slates/oauth-google';
import { createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { gmailError } from './lib/errors';

export const GMAIL_READ = 'https://www.googleapis.com/auth/gmail.readonly';
export const GMAIL_MODIFY = 'https://www.googleapis.com/auth/gmail.modify';
export const GMAIL_COMPOSE = 'https://www.googleapis.com/auth/gmail.compose';
export const GMAIL_FULL = 'https://mail.google.com/';

const tokenResponseSchema = z
  .object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1).optional(),
    expires_in: z.union([z.number(), z.string()]).optional(),
    scope: z.string().min(1).optional(),
    token_type: z.string().optional()
  })
  .passthrough();
const tokenClient = createAxios({
  baseURL: 'https://oauth2.googleapis.com',
  timeout: 30000,
  maxRedirects: 0
});
const method = (key: string, name: string, scope: string, description: string) =>
  createGoogleOAuth({
    key,
    name,
    scopes: [{ title: name, scope, description }],
    dependencies: {
      requestToken: async request => {
        const fields = new URLSearchParams({
          client_id: request.clientId,
          client_secret: request.clientSecret,
          grant_type: request.grantType
        });
        if (request.grantType === 'authorization_code') {
          if (!request.code || !request.redirectUri)
            throw createApiServiceError(
              'Google authorization code and redirect URI are required.'
            );
          fields.set('code', request.code);
          fields.set('redirect_uri', request.redirectUri);
        } else {
          if (!request.refreshToken)
            throw createApiServiceError('Reconnect Google to obtain offline access.');
          fields.set('refresh_token', request.refreshToken);
        }
        try {
          const response = await tokenClient.post('/token', fields.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
          const parsed = tokenResponseSchema.safeParse(response.data);
          if (
            !parsed.success ||
            [...parsed.data.access_token].some(
              char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127
            ) ||
            (parsed.data.refresh_token !== undefined && !parsed.data.refresh_token.trim()) ||
            (parsed.data.scope !== undefined && !parsed.data.scope.trim()) ||
            (parsed.data.token_type !== undefined &&
              parsed.data.token_type.toLowerCase() !== 'bearer')
          )
            throw createApiServiceError(
              'Google returned an invalid OAuth token response. Reconnect Google.'
            );
          return parsed.data;
        } catch (error) {
          throw gmailError(error, 'OAuth token exchange');
        }
      },
      getUserInfo: async token => {
        const profile = await new Client({ token, userId: 'me' }).getProfile();
        return {
          id: profile.emailAddress,
          email: profile.emailAddress,
          name: profile.emailAddress
        };
      }
    }
  });

const authOutput = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authMethod: z.literal('oauth').optional(),
  grantedScopes: z.array(z.string()).optional()
});
export const auth = SlateAuth.create().output(authOutput);
for (const [key, name, scope, description] of [
  [
    'google_oauth',
    'Google OAuth',
    GMAIL_MODIFY,
    'Read mail, manage drafts and labels, trash or restore conversations, and send mail.'
  ],
  [
    'google_oauth_readonly',
    'Google OAuth Read Only',
    GMAIL_READ,
    'Read conversations, drafts and files without changing the mailbox.'
  ],
  [
    'google_oauth_full_access',
    'Google OAuth Full Access',
    GMAIL_FULL,
    'Read and manage mail, including irreversible permanent deletion of conversations.'
  ]
] as const) {
  const shared = method(key, name, scope, description);
  auth.addOauth({
    ...shared,
    getAuthorizationUrl: async ctx => ({
      ...(await shared.getAuthorizationUrl(ctx)),
      callbackState: { expectedState: ctx.state }
    }),
    handleCallback: async ctx => {
      if (!ctx.state || ctx.callbackState?.expectedState !== ctx.state)
        throw createApiServiceError(
          'Google authorization state did not match. Restart the connection.'
        );
      const result = await shared.handleCallback(ctx);
      return { ...result, output: { ...result.output, grantedScopes: result.scopes } };
    },
    handleTokenRefresh: async (
      ctx: Omit<Parameters<typeof shared.handleTokenRefresh>[0], 'output'> & {
        output: z.infer<typeof authOutput>;
      }
    ) => shared.handleTokenRefresh({ ...ctx, output: { ...ctx.output, authMethod: 'oauth' } }),
    getProfile: async (
      ctx: Omit<Parameters<typeof shared.getProfile>[0], 'output'> & {
        output: z.infer<typeof authOutput>;
      }
    ) => shared.getProfile({ ...ctx, output: { ...ctx.output, authMethod: 'oauth' } })
  });
}
