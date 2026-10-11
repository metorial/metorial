import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { wordpressApiError, wordpressServiceError } from './lib/errors';

let wpcomAxios = createAxios({
  baseURL: 'https://public-api.wordpress.com'
});

wpcomAxios.interceptors.response.use(
  response => response,
  error => Promise.reject(wordpressApiError(error, 'authentication'))
);

let normalizeSiteUrl = (value: string) => {
  let trimmed = value.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw wordpressServiceError(
      'Site URL must be a full HTTPS URL, such as "https://example.com".'
    );
  }

  // WordPress only offers application passwords over HTTPS; never send them in clear text.
  if (url.protocol !== 'https:') {
    throw wordpressServiceError('Site URL must use HTTPS.');
  }

  // Accept a pasted REST API or admin URL and keep only the site root.
  let path = url.pathname.replace(/\/(wp-json|wp-admin)(\/.*)?$/i, '');
  return `${url.origin}${path}`.replace(/\/+$/, '');
};

let encodeBasicCredentials = (username: string, applicationPassword: string) =>
  Buffer.from(`${username}:${applicationPassword}`, 'utf8').toString('base64');

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'WordPress.com bearer token, or base64-encoded username:application-password credentials'
        ),
      authMethod: z
        .enum(['oauth', 'application_password'])
        .describe('Which authentication method is being used'),
      siteUrl: z
        .string()
        .describe(
          'URL of the connected site: the authorized WordPress.com blog URL, or the self-hosted site URL'
        ),
      blogId: z
        .string()
        .optional()
        .describe('WordPress.com blog ID the OAuth token is authorized for')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'WordPress.com OAuth',
    key: 'wpcom_oauth',

    // WordPress.com issues a single-blog token with full access to the blog the
    // user picks on the consent screen when no scope is requested. Endpoint-group
    // scopes cannot reach the site settings endpoints, and "global" grants every
    // site and WordPress.com service, so no scopes are requested.
    scopes: [],

    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'WordPress.com OAuth2 authentication',
        url: 'https://developer.wordpress.com/docs/oauth2/'
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
        url: `https://public-api.wordpress.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await wpcomAxios.post(
        '/oauth2/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data ?? {};
      let token = typeof data.access_token === 'string' ? data.access_token : '';
      let blogId =
        data.blog_id !== undefined && data.blog_id !== null ? String(data.blog_id) : '';
      let blogUrl = typeof data.blog_url === 'string' ? data.blog_url : '';

      if (!token) {
        throw wordpressServiceError('WordPress.com did not return an access token.');
      }
      if (!blogId || blogId === '0') {
        throw wordpressServiceError(
          'WordPress.com did not return the authorized site. Reconnect and select a site on the consent screen.'
        );
      }

      // Authorization-code tokens do not expire and WordPress.com has no refresh
      // grant, so there is no refresh token or expiry to store.
      return {
        output: {
          token,
          authMethod: 'oauth' as const,
          siteUrl: blogUrl,
          blogId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; siteUrl: string; blogId?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await wpcomAxios.get('/rest/v1.1/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let me = response.data;

      return {
        profile: {
          id: String(me.ID),
          email: me.email,
          name: me.display_name,
          imageUrl: me.avatar_URL,
          username: me.username,
          siteId: ctx.output.blogId,
          siteUrl: ctx.output.siteUrl
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Application Password',
    key: 'application_password',

    inputSchema: z.object({
      siteUrl: z
        .string()
        .describe(
          'Self-hosted WordPress site URL, such as "https://example.com" or "https://example.com/blog"'
        ),
      username: z.string().describe('WordPress username'),
      applicationPassword: z
        .string()
        .describe(
          'Application password generated from WordPress admin (Users → Edit User → Application Passwords)'
        )
    }),

    getOutput: async (ctx: {
      input: { siteUrl: string; username: string; applicationPassword: string };
    }) => {
      return {
        output: {
          token: encodeBasicCredentials(ctx.input.username, ctx.input.applicationPassword),
          authMethod: 'application_password' as const,
          siteUrl: normalizeSiteUrl(ctx.input.siteUrl)
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; siteUrl: string };
      input: { siteUrl: string; username: string; applicationPassword: string };
    }) => {
      let http = createAxios({ baseURL: `${ctx.output.siteUrl}/wp-json/wp/v2` });
      let me: any;
      try {
        let response = await http.get('/users/me', {
          headers: {
            Authorization: `Basic ${ctx.output.token}`
          }
        });
        me = response.data;
      } catch (error) {
        throw wordpressApiError(error, 'credential check');
      }

      return {
        profile: {
          id: me?.id !== undefined ? String(me.id) : undefined,
          name: me?.name || ctx.input.username,
          username: me?.slug || ctx.input.username,
          imageUrl: me?.avatar_urls?.['96'],
          siteUrl: ctx.output.siteUrl
        }
      };
    }
  });
