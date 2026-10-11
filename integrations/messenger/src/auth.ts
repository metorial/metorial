import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { MESSENGER_DEFAULT_API_VERSION } from './config';
import { messengerOAuthError, messengerServiceError } from './lib/errors';

let MAX_ACCOUNT_PAGES = 10;

let graphRequest = async <T>(operation: string, run: () => Promise<{ data: T }>) => {
  try {
    let response = await run();
    return response.data;
  } catch (error) {
    throw messengerOAuthError(operation, error);
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Page Access Token for Messenger API calls'),
      pageId: z.string().optional().describe('The Facebook Page ID associated with the token')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Facebook OAuth',
    key: 'facebook_oauth',
    // Yields a Page access token plus its Page id.
    adapters: ['chat'],

    scopes: [
      {
        title: 'Pages Messaging',
        description: 'Send and receive messages on behalf of a Page',
        scope: 'pages_messaging'
      },
      {
        title: 'Pages Manage Metadata',
        description: 'Configure the Facebook app to send webhook events',
        scope: 'pages_manage_metadata'
      },
      {
        title: 'Pages Show List',
        description: 'Query the list of Pages that a person manages',
        scope: 'pages_show_list'
      },
      {
        title: 'Pages Read Engagement',
        description: 'Read Page content, follower data, and metadata',
        scope: 'pages_read_engagement'
      }
    ],

    inputSchema: z.object({
      pageId: z
        .string()
        .optional()
        .describe(
          'Facebook Page ID to obtain the access token for. If not provided, the first available page will be used.'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(',');
      let url = `https://www.facebook.com/${MESSENGER_DEFAULT_API_VERSION}/dialog/oauth?client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&state=${encodeURIComponent(ctx.state)}&scope=${encodeURIComponent(scopeString)}`;

      return { url, input: ctx.input };
    },

    handleCallback: async ctx => {
      let graphApi = createAxios({
        baseURL: `https://graph.facebook.com/${MESSENGER_DEFAULT_API_VERSION}`
      });

      // Exchange code for user access token
      let tokenResponse = await graphRequest<any>('exchange authorization code', () =>
        graphApi.get('/oauth/access_token', {
          params: {
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            code: ctx.code
          }
        })
      );

      let userAccessToken = tokenResponse.access_token as string | undefined;
      if (!userAccessToken) {
        throw messengerServiceError(
          'Facebook OAuth token response did not include an access token'
        );
      }

      // Exchange short-lived token for long-lived token
      let longLivedResponse = await graphRequest<any>('exchange long-lived token', () =>
        graphApi.get('/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            fb_exchange_token: userAccessToken
          }
        })
      );

      let longLivedUserToken = longLivedResponse.access_token as string | undefined;
      if (!longLivedUserToken) {
        throw messengerServiceError(
          'Facebook OAuth long-lived token response did not include an access token'
        );
      }

      // List the managed Pages, following cursors until the requested Page is found.
      // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
      let targetPageId = ctx.input.pageId?.trim() || undefined;
      let pages: Array<{ id: string; name: string; access_token: string }> = [];
      let after: string | undefined;
      for (let pageIndex = 0; pageIndex < MAX_ACCOUNT_PAGES; pageIndex++) {
        let pagesResponse = await graphRequest<any>('list managed pages', () =>
          graphApi.get('/me/accounts', {
            params: {
              access_token: longLivedUserToken,
              fields: 'id,name,access_token',
              limit: 100,
              ...(after ? { after } : {})
            }
          })
        );
        let batch = Array.isArray(pagesResponse?.data) ? pagesResponse.data : [];
        pages.push(...batch);

        let nextAfter = pagesResponse?.paging?.next
          ? pagesResponse?.paging?.cursors?.after
          : undefined;
        if (!targetPageId || pages.some(p => p.id === targetPageId) || !nextAfter) break;
        after = nextAfter;
      }

      if (pages.length === 0) {
        throw messengerServiceError(
          'No Facebook Pages found. Please ensure you have admin access to at least one Page.'
        );
      }

      // Find the requested page or use the first one
      let page = targetPageId ? pages.find(p => p.id === targetPageId) : pages[0];

      if (!page) {
        throw messengerServiceError(
          `Page with ID ${targetPageId} not found. Available pages: ${pages.map(p => `${p.name} (${p.id})`).join(', ')}`
        );
      }

      return {
        output: {
          token: page.access_token,
          pageId: page.id
        },
        input: {
          pageId: page.id
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      // Page access tokens derived from long-lived user tokens are non-expiring
      // If token refresh is needed, re-authorize
      return {
        output: ctx.output
      };
    },

    getProfile: async (ctx: {
      output: { token: string; pageId?: string };
      input: { pageId?: string };
      scopes: string[];
    }) => {
      let graphApi = createAxios({
        baseURL: `https://graph.facebook.com/${MESSENGER_DEFAULT_API_VERSION}`
      });

      let pageId = ctx.output.pageId || 'me';
      let data = await graphRequest<{
        id?: string;
        name?: string;
        picture?: { data?: { url?: string } };
      }>('get OAuth profile', () =>
        graphApi.get(`/${pageId}`, {
          params: {
            fields: 'id,name,picture',
            access_token: ctx.output.token
          }
        })
      );

      return {
        profile: {
          id: data.id,
          name: data.name,
          imageUrl: data.picture?.data?.url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Page Access Token',
    key: 'page_access_token',
    // The Page id comes from this input or config.
    adapters: ['chat'],

    inputSchema: z.object({
      token: z.string().describe('A valid Facebook Page Access Token'),
      pageId: z
        .string()
        .optional()
        .describe(
          'The Facebook Page ID associated with this token. Detected from the token when left empty.'
        )
    }),

    getOutput: async ctx => {
      let pageId = ctx.input.pageId?.trim() || undefined;

      // A Page access token resolves `me` to its Page; webhook routing needs that id.
      // Best-effort: tools still work through `me` when the lookup is refused.
      if (!pageId) {
        try {
          let graphApi = createAxios({
            baseURL: `https://graph.facebook.com/${MESSENGER_DEFAULT_API_VERSION}`
          });
          let response = await graphApi.get<{ id?: string | number }>('/me', {
            params: { fields: 'id', access_token: ctx.input.token }
          });
          let id = response.data?.id;
          if (id !== undefined && id !== null && String(id)) pageId = String(id);
        } catch {
          pageId = undefined;
        }
      }

      // Without a Page id the connection has no routing matcher, so events would be dropped silently.
      if (!pageId && !ctx.config?.pageId) {
        throw messengerServiceError(
          'Could not detect the Facebook Page for this token. Enter the Page ID and connect again.'
        );
      }

      return {
        output: {
          token: ctx.input.token,
          pageId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; pageId?: string };
      input: { token: string; pageId?: string };
    }) => {
      let graphApi = createAxios({
        baseURL: `https://graph.facebook.com/${MESSENGER_DEFAULT_API_VERSION}`
      });

      let pageId = ctx.output.pageId || 'me';
      let data = await graphRequest<{
        id?: string;
        name?: string;
        picture?: { data?: { url?: string } };
      }>('get token auth profile', () =>
        graphApi.get(`/${pageId}`, {
          params: {
            fields: 'id,name,picture',
            access_token: ctx.output.token
          }
        })
      );

      return {
        profile: {
          id: data.id,
          name: data.name,
          imageUrl: data.picture?.data?.url
        }
      };
    }
  });
