import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Experimentation OAuth',
    key: 'experimentation_oauth',

    scopes: [
      {
        title: 'All Access',
        description: 'Full read and write access to Optimizely Experimentation',
        scope: 'all'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scopes: ctx.scopes.join(',')
      });
      return {
        url: `https://app.optimizely.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();
      let response = await axios.post(
        'https://app.optimizely.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }
      let axios = createAxios();
      let response = await axios.post(
        'https://app.optimizely.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'CMP OAuth (Client Credentials)',
    key: 'cmp_oauth',

    scopes: [
      {
        title: 'CMP Access',
        description: 'Access to Optimizely Content Marketing Platform API',
        scope: 'cmp'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      return {
        url: `https://api.cmp.optimizely.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();
      let response = await axios.post(
        'https://api.cmp.optimizely.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }
      let axios = createAxios();
      let response = await axios.post(
        'https://api.cmp.optimizely.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal Access Token generated from Optimizely app (Profile > API Access > Generate New Token). Works for Experimentation APIs.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'CMS Client Credentials',
    key: 'cms_client_credentials',

    inputSchema: z.object({
      clientId: z
        .string()
        .describe('CMS API Client ID (found under Settings > API Keys in your CMS instance)'),
      clientSecret: z.string().describe('CMS API Client Secret')
    }),

    getOutput: async ctx => {
      let axios = createAxios();
      let response = await axios.post(
        'https://api.cms.optimizely.com/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ctx.input.clientId,
          client_secret: ctx.input.clientSecret
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      return {
        output: {
          token: data.access_token,
          expiresAt: new Date(Date.now() + (data.expires_in || 300) * 1000).toISOString()
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Campaign Basic Auth',
    key: 'campaign_basic_auth',

    inputSchema: z.object({
      username: z
        .string()
        .describe(
          'Campaign API username (found under Administration > API Overview > REST API)'
        ),
      password: z.string().describe('Campaign API password')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.username}:${ctx.input.password}`);
      return {
        output: {
          token: `Basic ${encoded}`
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'ODP API Key',
    key: 'odp_api_key',

    inputSchema: z.object({
      token: z.string().describe('ODP API key obtained from the ODP dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
