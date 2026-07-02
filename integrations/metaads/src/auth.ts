import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { metaAdsApiError } from './lib/errors';

let createGraphAxios = () => {
  let axios = createAxios({ baseURL: 'https://graph.facebook.com' });

  axios.interceptors.response.use(
    response => response,
    error => Promise.reject(metaAdsApiError(error, 'auth request'))
  );

  return axios;
};

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
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Ads Management',
        description: 'Create, edit, and delete campaigns, ad sets, and ads',
        scope: 'ads_management'
      },
      {
        title: 'Ads Read',
        description: 'Read performance data, campaign details, and insights',
        scope: 'ads_read'
      },
      {
        title: 'Business Management',
        description: 'Manage business assets like ad accounts, pixels, and catalogs',
        scope: 'business_management'
      },
      {
        title: 'Pages Read Engagement',
        description: 'Read content posted on Pages and engagement data',
        scope: 'pages_read_engagement'
      },
      {
        title: 'Leads Retrieval',
        description: 'Retrieve lead data submitted through lead ads',
        scope: 'leads_retrieval'
      },
      {
        title: 'Pages Manage Metadata',
        description: 'Subscribe apps to receive webhooks for Page events',
        scope: 'pages_manage_metadata'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(','),
        response_type: 'code'
      });

      return {
        url: `https://www.facebook.com/dialog/oauth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createGraphAxios();

      let response = await axios.get('/oauth/access_token', {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }
      });

      let shortLivedToken = response.data.access_token;

      // Exchange short-lived token for long-lived token
      let longLivedResponse = await axios.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          fb_exchange_token: shortLivedToken
        }
      });

      let expiresAt: string | undefined;
      if (longLivedResponse.data.expires_in) {
        let expiresDate = new Date(Date.now() + longLivedResponse.data.expires_in * 1000);
        expiresAt = expiresDate.toISOString();
      }

      return {
        output: {
          token: longLivedResponse.data.access_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let axios = createGraphAxios();

      // Meta long-lived tokens can be refreshed by exchanging again
      let response = await axios.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          fb_exchange_token: ctx.output.token
        }
      });

      let expiresAt: string | undefined;
      if (response.data.expires_in) {
        let expiresDate = new Date(Date.now() + response.data.expires_in * 1000);
        expiresAt = expiresDate.toISOString();
      }

      return {
        output: {
          token: response.data.access_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let axios = createGraphAxios();

      let response = await axios.get('/me', {
        params: {
          fields: 'id,name,email',
          access_token: ctx.output.token
        }
      });

      return {
        profile: {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'System User Token',
    key: 'system_user_token',

    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'System User access token generated from Business Manager. These tokens do not expire.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { apiToken: string };
    }) => {
      let axios = createGraphAxios();

      let response = await axios.get('/me', {
        params: {
          fields: 'id,name',
          access_token: ctx.output.token
        }
      });

      return {
        profile: {
          id: response.data.id,
          name: response.data.name
        }
      };
    }
  });
