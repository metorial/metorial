import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { createInstanceToken, verifyInstalledInstance } from './lib/oauth';

let validateContextIds = (siteId?: string, accountId?: string) => {
  if (siteId && accountId) {
    throw createApiServiceError('Use either siteId or accountId for Wix API calls, not both.');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      expiresAt: z.string().optional(),
      instanceId: z.string().optional(),
      siteId: z.string().optional(),
      accountId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (Site Owner)',
    key: 'oauth',
    scopes: [],
    inputSchema: z.object({
      shareUrlId: z
        .string()
        .uuid()
        .optional()
        .describe(
          'App developer setup only: share install link ID for an unlisted Wix app. Leave empty for an App Market listed app.'
        )
    }),
    getAuthorizationUrl: async ctx => {
      let callbackUrl = new URL(ctx.redirectUri);
      if (callbackUrl.protocol !== 'https:') {
        throw createApiServiceError('Wix requires an HTTPS callback URL.');
      }
      callbackUrl.searchParams.set('state', ctx.state);
      // The callback router requires a code; this public marker is only routing
      // metadata. The signed installation is the credential, verified below.
      callbackUrl.searchParams.set('code', 'wix-external-install');
      let url = new URL('https://www.wix.com/app-installer');
      url.searchParams.set('appId', ctx.clientId);
      url.searchParams.set('postInstallationUrl', callbackUrl.toString());
      if (ctx.input.shareUrlId) url.searchParams.set('shareUrlId', ctx.input.shareUrlId);
      return {
        url: url.toString(),
        callbackState: { state: ctx.state, startedAt: Date.now() }
      };
    },
    handleCallback: async ctx => {
      if (
        !ctx.state ||
        ctx.state !== ctx.callbackState?.state ||
        ctx.code !== 'wix-external-install' ||
        ctx.callbackParams?.appId !== ctx.clientId
      ) {
        throw createApiServiceError(
          'Wix installation callback did not match this connection.'
        );
      }
      let signedInstance = ctx.callbackParams?.signedInstance;
      if (!signedInstance || !ctx.callbackParams?.instanceId) {
        throw createApiServiceError(
          'Wix installation was canceled or its signed confirmation is missing.'
        );
      }
      let instanceId = verifyInstalledInstance(
        signedInstance,
        ctx.clientSecret,
        ctx.callbackState.startedAt
      );
      if (instanceId !== ctx.callbackParams.instanceId) {
        throw createApiServiceError(
          'Wix installation identifier did not match its signed confirmation.'
        );
      }
      return {
        output: {
          ...(await createInstanceToken(ctx.clientId, ctx.clientSecret, instanceId)),
          instanceId
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        instanceId?: string;
        expiresAt?: string;
        siteId?: string;
        accountId?: string;
      };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.instanceId) {
        throw createApiServiceError('Wix installation is missing. Connect Wix again.');
      }
      return {
        output: {
          ...ctx.output,
          ...(await createInstanceToken(ctx.clientId, ctx.clientSecret, ctx.output.instanceId))
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Wix API Key generated from the API Keys Manager'),
      siteId: z.string().optional().describe('Wix Site ID for site-level API calls'),
      accountId: z.string().optional().describe('Wix Account ID for account-level API calls')
    }),
    getOutput: async ctx => {
      validateContextIds(ctx.input.siteId, ctx.input.accountId);
      return {
        output: {
          token: ctx.input.apiKey,
          siteId: ctx.input.siteId,
          accountId: ctx.input.accountId
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth App Credentials',
    key: 'oauth_app',
    inputSchema: z.object({
      appId: z.string().describe('Wix App ID'),
      appSecret: z.string().describe('Wix App Secret Key'),
      instanceId: z
        .string()
        .describe('Wix App Instance ID (unique identifier for the app on a specific site)'),
      siteId: z.string().optional().describe('Wix Site ID for site-level API calls'),
      accountId: z.string().optional().describe('Wix Account ID for account-level API calls')
    }),
    getOutput: async ctx => {
      validateContextIds(ctx.input.siteId, ctx.input.accountId);
      // This method has no refresh handler, so it keeps its original output without expiresAt.
      let { token } = await createInstanceToken(
        ctx.input.appId,
        ctx.input.appSecret,
        ctx.input.instanceId
      );

      return {
        output: {
          token,
          siteId: ctx.input.siteId,
          accountId: ctx.input.accountId
        }
      };
    }
  });
