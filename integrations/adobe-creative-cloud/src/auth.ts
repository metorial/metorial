import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let imsAxios = createAxios({
  baseURL: 'https://ims-na1.adobelogin.com'
});

let scopes = [
  { title: 'OpenID', description: 'OpenID Connect authentication', scope: 'openid' },
  {
    title: 'Adobe ID',
    description: 'Access to Adobe ID profile information',
    scope: 'AdobeID'
  },
  { title: 'Profile', description: 'Access to user profile information', scope: 'profile' },
  { title: 'Email', description: 'Access to user email address', scope: 'email' },
  {
    title: 'Creative Cloud Files',
    description: 'Access to Creative Cloud file storage',
    scope: 'cc_files'
  },
  {
    title: 'Creative Cloud Libraries',
    description: 'Access to Creative Cloud Libraries',
    scope: 'cc_libraries'
  },
  {
    title: 'Creative SDK',
    description: 'Access to Creative SDK features',
    scope: 'creative_sdk'
  },
  {
    title: 'Firefly API',
    description: 'Access to Firefly generative AI services',
    scope: 'firefly_api'
  },
  {
    title: 'Firefly APIs',
    description: 'Access to additional Firefly service APIs',
    scope: 'ff_apis'
  },
  { title: 'Session', description: 'Session management scope', scope: 'session' },
  {
    title: 'Additional Info',
    description: 'Access to additional user information',
    scope: 'additional_info'
  },
  {
    title: 'Read Organizations',
    description: 'Access to organization information',
    scope: 'read_organizations'
  }
];

function createAdobeCcOauth(opts: { name: string; key: string; requireOrgId: boolean }) {
  let inputSchema = opts.requireOrgId
    ? z.object({
        orgId: z.string().describe('Adobe Organization ID (required for enterprise features)')
      })
    : z.object({});

  return {
    type: 'auth.oauth' as const,
    name: opts.name,
    key: opts.key,
    scopes,
    inputSchema,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(','),
        response_type: 'code',
        state: ctx.state
      });
      return {
        url: `https://ims-na1.adobelogin.com/ims/authorize/v2?${params.toString()}`
      };
    },

    handleCallback: async (ctx: any) => {
      let response = await imsAxios.post(
        '/ims/token/v3',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          clientId: ctx.clientId,
          orgId: opts.requireOrgId ? ctx.input.orgId : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }
      let response = await imsAxios.post(
        '/ims/token/v3',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          clientId: ctx.output.clientId,
          orgId: ctx.output.orgId
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await imsAxios.get('/ims/userinfo/v2', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      let data = response.data;
      return {
        profile: {
          id: data.sub || data.userId,
          email: data.email,
          name: data.name || data.displayName,
          imageUrl: data.picture
        }
      };
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      clientId: z.string(),
      orgId: z.string().optional()
    })
  )
  .addOauth(
    createAdobeCcOauth({
      name: 'Personal',
      key: 'oauth_personal',
      requireOrgId: false
    })
  )
  .addOauth(
    createAdobeCcOauth({
      name: 'Enterprise',
      key: 'oauth_enterprise',
      requireOrgId: true
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Server-to-Server (Client Credentials)',
    key: 'server_to_server',

    inputSchema: z.object({
      clientId: z.string().describe('Client ID from Adobe Developer Console'),
      clientSecret: z.string().describe('Client Secret from Adobe Developer Console'),
      scopes: z
        .string()
        .describe('Comma-separated scopes (e.g. openid,AdobeID,firefly_api,ff_apis)'),
      orgId: z.string().optional().describe('Adobe Organization ID')
    }),

    getOutput: async ctx => {
      let response = await imsAxios.post(
        '/ims/token/v3',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ctx.input.clientId,
          client_secret: ctx.input.clientSecret,
          scope: ctx.input.scopes
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          expiresAt,
          clientId: ctx.input.clientId,
          orgId: ctx.input.orgId
        }
      };
    }
  });
