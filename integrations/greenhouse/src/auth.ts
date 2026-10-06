import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  type AuthState,
  authSchema,
  currentAuth,
  exchange,
  profile,
  SCOPES
} from './lib/auth-state';
import { fail, opaque, retiredAuth } from './lib/helpers';

export const auth = SlateAuth.create()
  .output(authSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'Retired Harvest API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Retired Harvest v1/v2 key. Reconnect using Harvest v3 OAuth credentials; v1/v2 became unavailable after August 31, 2026.'
        )
    }),
    getOutput: async () => retiredAuth(),
    getProfile: async () => retiredAuth()
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Harvest v3 Custom Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      clientId: z
        .string()
        .describe(
          'Client ID from a Harvest v3 OAuth credential created in Greenhouse API Credentials.'
        ),
      clientSecret: z.string().describe('Client secret for that credential.'),
      userId: z
        .string()
        .optional()
        .describe(
          'Optional Site Admin acting user ID. Omit to use the credential’s integration service user.'
        )
    }),
    getOutput: async ctx => {
      const output = await exchange({ mode: 'custom', ...ctx.input });
      return { output, scopes: output.scopes };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthState;
      input: { clientId: string; clientSecret: string; userId?: string };
    }) => {
      const previous = currentAuth(ctx.output);
      return {
        output: await exchange({
          mode: 'custom',
          ...ctx.input,
          organizationId: previous.organizationId,
          expectedSubjectId: previous.subjectId
        })
      };
    },
    getProfile: async (ctx: { output: AuthState }) => profile(ctx.output)
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Harvest v3 Approved Partner OAuth',
    key: 'oauth',
    scopes: SCOPES.map(scope => ({ scope, title: scope })),
    getAuthorizationUrl: async ctx => {
      const url = new URL('https://auth.greenhouse.io/authorize');
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: opaque(ctx.clientId, 'Client ID'),
        redirect_uri: ctx.redirectUri,
        scope: (ctx.scopes.length ? ctx.scopes : SCOPES).join(' '),
        state: opaque(ctx.state, 'Authorization state')
      }).toString();
      return { url: url.toString() };
    },
    handleCallback: async ctx => {
      if (ctx.callbackParams?.error)
        fail(
          'Greenhouse declined authorization. Check the approved partner application, registered redirect URI and scopes, then reconnect.',
          'invalid_authentication'
        );
      const output = await exchange({
        mode: 'partner',
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        code: ctx.code
      });
      return { output, scopes: output.scopes };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthState;
      clientId: string;
      clientSecret: string;
    }) => {
      const previous = currentAuth(ctx.output);
      return {
        output: await exchange({
          mode: 'partner',
          clientId: ctx.clientId,
          clientSecret: ctx.clientSecret,
          refreshToken: previous.refreshToken,
          organizationId: previous.organizationId,
          expectedSubjectId: previous.subjectId
        })
      };
    },
    getProfile: async (ctx: { output: AuthState }) => profile(ctx.output)
  });
