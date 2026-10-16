import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, type SmugMugClientConfig } from './lib/client';
import { getAccessToken, getRequestToken } from './lib/oauth1';

let getProfile = async (ctx: { output: SmugMugClientConfig }) => {
  let user = await new Client(ctx.output).getAuthenticatedUser();
  return {
    profile: { id: user.NickName, name: user.Name, imageUrl: user.ImageSmallUrl ?? undefined }
  };
};

let oauthMethod = (key: string, name: string, permission: 'Read' | 'Add' | 'Modify') => ({
  type: 'auth.oauth' as const,
  name,
  key,
  scopes: [
    {
      title: permission,
      description:
        permission === 'Read'
          ? 'Read public and private content'
          : permission === 'Add'
            ? 'Read and create content'
            : 'Read, create, update, and delete content',
      scope: permission
    }
  ],
  getAuthorizationUrl: async (ctx: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  }) => {
    let { oauthToken, oauthTokenSecret } = await getRequestToken(
      ctx.clientId,
      ctx.clientSecret,
      ctx.redirectUri
    );
    // Existing connections can retain their previously granted permission tier.
    let permissions = ctx.scopes.includes('Modify')
      ? 'Modify'
      : ctx.scopes.includes('Add')
        ? 'Add'
        : 'Read';
    let params = new URLSearchParams({
      oauth_token: oauthToken,
      Access: 'Full',
      Permissions: permissions
    });
    return {
      url: `https://api.smugmug.com/services/oauth/1.0a/authorize?${params}`,
      callbackState: { oauthToken, oauthTokenSecret }
    };
  },
  handleCallback: async (ctx: {
    clientId: string;
    clientSecret: string;
    code: string;
    callbackParams?: Record<string, string>;
    callbackState: Record<string, any>;
  }) => {
    let state = z
      .object({ oauthToken: z.string().min(1), oauthTokenSecret: z.string().min(1) })
      .safeParse(ctx.callbackState);
    let verifier = ctx.callbackParams?.oauth_verifier ?? ctx.code;
    if (
      !state.success ||
      !verifier ||
      (ctx.callbackParams?.oauth_token !== undefined &&
        ctx.callbackParams.oauth_token !== state.data.oauthToken)
    ) {
      throw createApiServiceError(
        'The SmugMug authorization callback is invalid or expired. Reconnect and authorize again.',
        { reason: 'invalid_oauth_callback' }
      );
    }
    let { oauthToken, oauthTokenSecret } = await getAccessToken(
      ctx.clientId,
      ctx.clientSecret,
      state.data.oauthToken,
      state.data.oauthTokenSecret,
      verifier
    );
    return {
      output: {
        token: oauthToken,
        tokenSecret: oauthTokenSecret,
        consumerKey: ctx.clientId,
        consumerSecret: ctx.clientSecret
      }
    };
  },
  getProfile
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OAuth access token'),
      tokenSecret: z.string().describe('OAuth access token secret'),
      consumerKey: z.string().describe('OAuth consumer key (API key)'),
      consumerSecret: z.string().describe('OAuth consumer secret')
    })
  )
  .addOauth(oauthMethod('oauth1', 'OAuth 1.0a — Full access', 'Modify'))
  .addOauth(oauthMethod('oauth1_read', 'OAuth 1.0a — Read only', 'Read'))
  .addOauth(oauthMethod('oauth1_add', 'OAuth 1.0a — Read and add', 'Add'))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys & Access Token',
    key: 'api_keys',
    inputSchema: z.object({
      consumerKey: z
        .string()
        .describe('API Key (Consumer Key) from SmugMug developer settings'),
      consumerSecret: z
        .string()
        .describe('API Secret (Consumer Secret) from SmugMug developer settings'),
      accessToken: z
        .string()
        .describe('OAuth access token for the authorized SmugMug account'),
      accessTokenSecret: z
        .string()
        .describe('OAuth access token secret for the authorized SmugMug account')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.accessToken,
        tokenSecret: ctx.input.accessTokenSecret,
        consumerKey: ctx.input.consumerKey,
        consumerSecret: ctx.input.consumerSecret
      }
    }),
    getProfile
  });
