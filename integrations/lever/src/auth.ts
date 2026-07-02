import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'Offline Access',
    description: 'Required to receive a refresh token for persistent authentication',
    scope: 'offline_access'
  },
  {
    title: 'Applications Read',
    description: 'View all opportunity applications',
    scope: 'applications:read:admin'
  },
  {
    title: 'Archive Reasons',
    description: 'View all archive reasons',
    scope: 'archive_reasons:read:admin'
  },
  {
    title: 'Confidential Access',
    description: 'Access all confidential data',
    scope: 'confidential:access:admin'
  },
  {
    title: 'Contacts Read',
    description: 'View opportunity contacts',
    scope: 'contact:read:admin'
  },
  {
    title: 'Contacts Write',
    description: 'Manage opportunity contacts',
    scope: 'contact:write:admin'
  },
  { title: 'Feedback Read', description: 'View feedback forms', scope: 'feedback:read:admin' },
  {
    title: 'Feedback Write',
    description: 'Manage feedback forms',
    scope: 'feedback:write:admin'
  },
  {
    title: 'Files Read',
    description: 'View files attached to opportunities',
    scope: 'files:read:admin'
  },
  {
    title: 'Files Write',
    description: 'Manage files attached to opportunities',
    scope: 'files:write:admin'
  },
  { title: 'Forms Read', description: 'View profile forms', scope: 'forms:read:admin' },
  { title: 'Forms Write', description: 'Manage profile forms', scope: 'forms:write:admin' },
  { title: 'Interviews Read', description: 'View interviews', scope: 'interviews:read:admin' },
  {
    title: 'Interviews Write',
    description: 'Manage interviews',
    scope: 'interviews:write:admin'
  },
  { title: 'Notes Read', description: 'View notes', scope: 'notes:read:admin' },
  { title: 'Notes Write', description: 'Manage notes', scope: 'notes:write:admin' },
  { title: 'Offers Read', description: 'View all offers', scope: 'offers:read:admin' },
  {
    title: 'Opportunities Read',
    description: 'View opportunities',
    scope: 'opportunities:read:admin'
  },
  {
    title: 'Opportunities Write',
    description: 'Manage opportunities',
    scope: 'opportunities:write:admin'
  },
  { title: 'Panels Read', description: 'View interview panels', scope: 'panels:read:admin' },
  {
    title: 'Panels Write',
    description: 'Manage interview panels',
    scope: 'panels:write:admin'
  },
  { title: 'Postings Read', description: 'View job postings', scope: 'postings:read:admin' },
  {
    title: 'Postings Write',
    description: 'Manage job postings',
    scope: 'postings:write:admin'
  },
  {
    title: 'Referrals Read',
    description: 'View all referrals',
    scope: 'referrals:read:admin'
  },
  {
    title: 'Requisitions Read',
    description: 'View requisitions',
    scope: 'requisitions:read:admin'
  },
  {
    title: 'Requisitions Write',
    description: 'Manage requisitions',
    scope: 'requisitions:write:admin'
  },
  { title: 'Resumes Read', description: 'View all resumes', scope: 'resumes:read:admin' },
  {
    title: 'Sources Read',
    description: 'View all candidate sources',
    scope: 'sources:read:admin'
  },
  {
    title: 'Stages Read',
    description: 'View all pipeline stages',
    scope: 'stages:read:admin'
  },
  { title: 'Tags Read', description: 'View all tags', scope: 'tags:read:admin' },
  { title: 'Uploads Write', description: 'Manage file uploads', scope: 'uploads:write:admin' },
  { title: 'Users Read', description: 'View users', scope: 'users:read:admin' },
  { title: 'Users Write', description: 'Manage users', scope: 'users:write:admin' },
  { title: 'Webhooks Read', description: 'View webhooks', scope: 'webhooks:read:admin' },
  { title: 'Webhooks Write', description: 'Manage webhooks', scope: 'webhooks:write:admin' }
];

function createLeverOauth(name: string, key: string, environment: 'production' | 'sandbox') {
  let isSandbox = environment === 'sandbox';
  let authUrl = isSandbox
    ? 'https://sandbox-lever.auth0.com/authorize'
    : 'https://auth.lever.co/authorize';
  let tokenUrl = isSandbox
    ? 'https://sandbox-lever.auth0.com/oauth/token'
    : 'https://auth.lever.co/oauth/token';
  let audience = isSandbox ? 'https://api.sandbox.lever.co/v1/' : 'https://api.lever.co/v1/';

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://hire.lever.co/developer/documentation#authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://hire.lever.co/developer/documentation#scopes'
      }
    ],
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        audience,
        scope: ctx.scopes.join(' ')
      });
      return { url: `${authUrl}?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let http = createAxios();
      let response = await http.post(tokenUrl, {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined,
          environment
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let http = createAxios();
      let response = await http.post(tokenUrl, {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });
      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined,
          environment
        }
      };
    }
  };
}

function createLeverApiKey(name: string, key: string, environment: 'production' | 'sandbox') {
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      apiKey: z.string().describe('Lever API key for basic auth')
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => ({
      output: {
        token: ctx.input.apiKey,
        environment
      }
    })
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      environment: z.enum(['production', 'sandbox'])
    })
  )
  .addOauth(createLeverOauth('Production', 'oauth_production', 'production'))
  .addOauth(createLeverOauth('Sandbox', 'oauth_sandbox', 'sandbox'))
  .addTokenAuth(createLeverApiKey('API Key (Production)', 'api_key_production', 'production'))
  .addTokenAuth(createLeverApiKey('API Key (Sandbox)', 'api_key_sandbox', 'sandbox'));
