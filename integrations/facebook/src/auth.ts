import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { facebookApiError } from './lib/errors';

let graphAxios = createAxios({
  baseURL: 'https://graph.facebook.com'
});
graphAxios.interceptors.response.use(
  response => response,
  error => Promise.reject(facebookApiError(error, 'OAuth request'))
);

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
    name: 'Facebook OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Public Profile',
        description: 'Access basic public profile information',
        scope: 'public_profile'
      },
      {
        title: 'Email',
        description: "Access the user's primary email address",
        scope: 'email'
      },
      {
        title: 'User Posts',
        description: "Access posts on the user's timeline",
        scope: 'user_posts'
      },
      {
        title: 'User Photos',
        description: "Access the user's photos",
        scope: 'user_photos'
      },
      {
        title: 'User Videos',
        description: "Access the user's videos",
        scope: 'user_videos'
      },
      {
        title: 'User Location',
        description: "Access the user's current city",
        scope: 'user_location'
      },
      {
        title: 'User Birthday',
        description: "Access the user's birthday",
        scope: 'user_birthday'
      },
      {
        title: 'User Link',
        description: "Access the user's profile link",
        scope: 'user_link'
      },
      {
        title: 'User Events',
        description: "Access the user's events",
        scope: 'user_events'
      },
      {
        title: 'Pages Show List',
        description: 'List Pages the user manages',
        scope: 'pages_show_list'
      },
      {
        title: 'Pages Read Engagement',
        description: 'Read engagement data for Pages the user manages',
        scope: 'pages_read_engagement'
      },
      {
        title: 'Pages Manage Posts',
        description: 'Create, edit, and delete posts on Pages the user manages',
        scope: 'pages_manage_posts'
      },
      {
        title: 'Pages Manage Metadata',
        description: 'Manage metadata of Pages the user manages',
        scope: 'pages_manage_metadata'
      },
      {
        title: 'Pages Read User Content',
        description: 'Read user-generated content on Pages',
        scope: 'pages_read_user_content'
      },
      {
        title: 'Pages Manage Engagement',
        description: 'Manage and create engagement on Pages',
        scope: 'pages_manage_engagement'
      },
      {
        title: 'Pages Messaging',
        description: 'Send and receive messages as a Page via Messenger',
        scope: 'pages_messaging'
      },
      {
        title: 'Ads Read',
        description: 'Read ad account data and reports',
        scope: 'ads_read'
      },
      {
        title: 'Business Management',
        description: 'Manage business assets and settings',
        scope: 'business_management'
      },
      {
        title: 'Leads Retrieval',
        description: 'Retrieve leads from Lead Ads forms',
        scope: 'leads_retrieval'
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
        url: `https://www.facebook.com/v25.0/dialog/oauth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await graphAxios.get('/v25.0/oauth/access_token', {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }
      });

      let { access_token } = response.data;

      // Exchange for a long-lived token
      let longLivedResponse = await graphAxios.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          fb_exchange_token: access_token
        }
      });

      let longLivedToken = longLivedResponse.data.access_token;
      let longLivedExpiresIn = longLivedResponse.data.expires_in;

      let expiresAt = longLivedExpiresIn
        ? new Date(Date.now() + longLivedExpiresIn * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: longLivedToken,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      // Facebook long-lived tokens can be refreshed by exchanging them again
      let response = await graphAxios.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          fb_exchange_token: ctx.output.token
        }
      });

      let { access_token, expires_in } = response.data;

      let expiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: access_token,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: Record<string, never>;
      scopes: string[];
    }) => {
      let response = await graphAxios.get('/me', {
        params: {
          fields: 'id,name,email,picture.type(large)',
          access_token: ctx.output.token
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          name: data.name,
          email: data.email,
          imageUrl: data.picture?.data?.url
        }
      };
    }
  });
