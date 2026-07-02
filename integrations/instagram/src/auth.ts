import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { instagramApiError, instagramServiceError } from './lib/errors';

let graphApi = createAxios({
  baseURL: 'https://graph.facebook.com'
});

let instagramApi = createAxios({
  baseURL: 'https://api.instagram.com'
});

let instagramGraphApi = createAxios({
  baseURL: 'https://graph.instagram.com'
});

let facebookGraphBaseUrl = 'https://graph.facebook.com';
let instagramGraphBaseUrl = 'https://graph.instagram.com';
let authApiVersion = 'v21.0';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      userId: z.string().optional(),
      apiBaseUrl: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Instagram Login',
    key: 'instagram_login',

    scopes: [
      {
        title: 'Basic Access',
        description: 'Read basic profile and media data',
        scope: 'instagram_business_basic'
      },
      {
        title: 'Publish Content',
        description: 'Publish media to Instagram',
        scope: 'instagram_business_content_publish'
      },
      {
        title: 'Manage Messages',
        description: 'Manage direct messages',
        scope: 'instagram_business_manage_messages'
      },
      {
        title: 'Manage Comments',
        description: 'Manage comments on media',
        scope: 'instagram_business_manage_comments'
      },
      {
        title: 'Manage Insights',
        description: 'Access analytics and insights',
        scope: 'instagram_business_manage_insights'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        enable_fb_login: '0',
        force_authentication: '1',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(','),
        state: ctx.state
      });

      return {
        url: `https://www.instagram.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let tokenResponse = await instagramApi.post(
          '/oauth/access_token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: ctx.redirectUri,
            code: ctx.code
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );

        let shortLivedToken = tokenResponse.data.access_token;
        let userId = String(tokenResponse.data.user_id);

        let longLivedResponse = await instagramGraphApi.get('/access_token', {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: ctx.clientSecret,
            access_token: shortLivedToken
          }
        });

        let longLivedToken = longLivedResponse.data.access_token;
        let expiresIn = longLivedResponse.data.expires_in as number;
        let expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        return {
          output: {
            token: longLivedToken,
            expiresAt,
            userId,
            apiBaseUrl: instagramGraphBaseUrl
          }
        };
      } catch (error) {
        throw instagramApiError(error, 'Instagram OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      try {
        let response = await instagramGraphApi.get('/refresh_access_token', {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: ctx.output.token
          }
        });

        let newToken = response.data.access_token;
        let expiresIn = response.data.expires_in as number;
        let expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        return {
          output: {
            ...ctx.output,
            token: newToken,
            expiresAt,
            apiBaseUrl: instagramGraphBaseUrl
          }
        };
      } catch (error) {
        throw instagramApiError(error, 'Instagram token refresh');
      }
    },

    getProfile: async (ctx: any) => {
      try {
        let response = await instagramGraphApi.get(`/${authApiVersion}/me`, {
          params: {
            fields:
              'id,username,name,profile_picture_url,account_type,followers_count,media_count',
            access_token: ctx.output.token
          }
        });

        return {
          profile: {
            id: response.data.id,
            name: response.data.name || response.data.username,
            email: undefined,
            imageUrl: response.data.profile_picture_url,
            username: response.data.username,
            accountType: response.data.account_type
          }
        };
      } catch (error) {
        throw instagramApiError(error, 'Instagram profile request');
      }
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'Facebook Login for Business',
    key: 'facebook_login',

    scopes: [
      {
        title: 'Instagram Basic',
        description: 'Read basic Instagram profile and media data',
        scope: 'instagram_basic'
      },
      {
        title: 'Publish Content',
        description: 'Publish content to Instagram',
        scope: 'instagram_content_publish'
      },
      {
        title: 'Manage Comments',
        description: 'Manage comments on Instagram media',
        scope: 'instagram_manage_comments'
      },
      {
        title: 'Manage Insights',
        description: 'Access analytics and insights',
        scope: 'instagram_manage_insights'
      },
      {
        title: 'Manage Messages',
        description: 'Manage Instagram direct messages',
        scope: 'instagram_manage_messages'
      },
      {
        title: 'Pages List',
        description: 'List managed Facebook Pages',
        scope: 'pages_show_list'
      },
      {
        title: 'Pages Read Engagement',
        description: 'Read Page metadata required to resolve linked Instagram accounts',
        scope: 'pages_read_engagement'
      },
      {
        title: 'Pages Metadata',
        description: 'Manage page metadata (required for webhooks)',
        scope: 'pages_manage_metadata'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(','),
        state: ctx.state
      });

      return {
        url: `https://www.facebook.com/${authApiVersion}/dialog/oauth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let tokenResponse = await graphApi.get(`/${authApiVersion}/oauth/access_token`, {
          params: {
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            code: ctx.code
          }
        });

        let shortLivedToken = tokenResponse.data.access_token;

        let longLivedResponse = await graphApi.get(`/${authApiVersion}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            fb_exchange_token: shortLivedToken
          }
        });

        let longLivedToken = longLivedResponse.data.access_token;
        let expiresIn = longLivedResponse.data.expires_in as number;
        let expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        let pagesResponse = await graphApi.get(`/${authApiVersion}/me/accounts`, {
          params: {
            fields: 'id,name,instagram_business_account',
            access_token: longLivedToken
          }
        });

        let userId: string | undefined;
        let pages = pagesResponse.data.data as Array<{
          id: string;
          name?: string;
          instagram_business_account?: { id?: string };
        }>;
        if (pages && pages.length > 0) {
          for (let page of pages) {
            if (page.instagram_business_account?.id) {
              userId = page.instagram_business_account.id;
              break;
            }
          }
        }

        if (!userId) {
          throw instagramServiceError(
            'No linked Instagram Business or Creator account was found. Connect an Instagram professional account to a Facebook Page and grant pages_read_engagement, pages_show_list, and instagram_basic.'
          );
        }

        return {
          output: {
            token: longLivedToken,
            expiresAt,
            userId,
            apiBaseUrl: facebookGraphBaseUrl
          }
        };
      } catch (error) {
        throw instagramApiError(error, 'Facebook OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      try {
        let response = await graphApi.get(`/${authApiVersion}/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            fb_exchange_token: ctx.output.token
          }
        });

        let newToken = response.data.access_token;
        let expiresIn = response.data.expires_in as number;
        let expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        return {
          output: {
            ...ctx.output,
            token: newToken,
            expiresAt,
            apiBaseUrl: facebookGraphBaseUrl
          }
        };
      } catch (error) {
        throw instagramApiError(error, 'Facebook token refresh');
      }
    },

    getProfile: async (ctx: any) => {
      if (!ctx.output.userId) {
        return {
          profile: {
            id: undefined,
            name: 'Unknown'
          }
        };
      }

      try {
        let response = await graphApi.get(`/${authApiVersion}/${ctx.output.userId}`, {
          params: {
            fields: 'id,username,name,profile_picture_url,followers_count,media_count',
            access_token: ctx.output.token
          }
        });

        return {
          profile: {
            id: response.data.id,
            name: response.data.name || response.data.username,
            imageUrl: response.data.profile_picture_url,
            username: response.data.username
          }
        };
      } catch (error) {
        throw instagramApiError(error, 'Facebook Instagram profile request');
      }
    }
  });
