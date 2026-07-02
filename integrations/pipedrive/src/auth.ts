import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { pipedriveApiError, pipedriveServiceError } from './lib/errors';

let companyDomainFromApiDomain = (apiDomain: unknown) => {
  if (typeof apiDomain !== 'string' || !apiDomain.trim()) {
    return undefined;
  }

  return apiDomain.replace('https://', '').replace('.pipedrive.com', '');
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      companyDomain: z.string().optional(),
      authType: z.enum(['oauth', 'api_token']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://pipedrive.readme.io/docs/marketplace-oauth-authorization'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://pipedrive.readme.io/docs/marketplace-scopes-and-permissions-explanations'
      }
    ],

    scopes: [
      {
        title: 'Base',
        description: 'Basic info: authorized user settings, currencies',
        scope: 'base'
      },
      {
        title: 'Deals Read',
        description: 'Read deals, pipelines, stages, notes, files, filters, statistics',
        scope: 'deals:read'
      },
      {
        title: 'Deals Full',
        description: 'Full CRUD on deals, participants, followers, notes, files, filters',
        scope: 'deals:full'
      },
      {
        title: 'Mail Read',
        description: 'Read mail threads and messages',
        scope: 'mail:read'
      },
      {
        title: 'Mail Full',
        description: 'Read, update, delete mail threads and messages',
        scope: 'mail:full'
      },
      {
        title: 'Activities Read',
        description: 'Read activities, activity fields and types',
        scope: 'activities:read'
      },
      {
        title: 'Activities Full',
        description: 'Full CRUD on activities, files, filters',
        scope: 'activities:full'
      },
      {
        title: 'Contacts Read',
        description: 'Read persons, organizations, related fields, followers',
        scope: 'contacts:read'
      },
      {
        title: 'Contacts Full',
        description: 'Full CRUD on persons, organizations, followers, notes, files',
        scope: 'contacts:full'
      },
      {
        title: 'Products Read',
        description: 'Read products, product fields, followers',
        scope: 'products:read'
      },
      {
        title: 'Products Full',
        description: 'Full CRUD on products and product fields',
        scope: 'products:full'
      },
      {
        title: 'Deal Fields Full',
        description: 'Full CRUD on deal custom fields',
        scope: 'deal-fields:full'
      },
      {
        title: 'Product Fields Full',
        description: 'Full CRUD on product custom fields',
        scope: 'product-fields:full'
      },
      {
        title: 'Contact Fields Full',
        description: 'Full CRUD on person and organization custom fields',
        scope: 'contact-fields:full'
      },
      {
        title: 'Users Read',
        description: 'Read users, permissions, roles, teams',
        scope: 'users:read'
      },
      {
        title: 'Recents Read',
        description: 'Read recent changes across the account',
        scope: 'recents:read'
      },
      {
        title: 'Search Read',
        description: 'Search across deals, persons, organizations, files, products',
        scope: 'search:read'
      },
      {
        title: 'Admin',
        description:
          'Manage pipelines, stages, fields, activity types, users, permissions, webhooks',
        scope: 'admin'
      },
      { title: 'Leads Read', description: 'Read leads and lead labels', scope: 'leads:read' },
      {
        title: 'Leads Full',
        description: 'Full CRUD on leads and lead labels',
        scope: 'leads:full'
      },
      { title: 'Goals Read', description: 'Read goals', scope: 'goals:read' },
      { title: 'Goals Full', description: 'Full CRUD on goals', scope: 'goals:full' },
      {
        title: 'Projects Read',
        description: 'Read projects, boards, phases, tasks, templates',
        scope: 'projects:read'
      },
      {
        title: 'Projects Full',
        description: 'Full CRUD on projects and tasks',
        scope: 'projects:full'
      },
      {
        title: 'Webhooks Read',
        description: 'Read webhooks created by the app',
        scope: 'webhooks:read'
      },
      {
        title: 'Webhooks Full',
        description: 'Create, read, and delete webhooks',
        scope: 'webhooks:full'
      },
      {
        title: 'Phone Integration',
        description: 'Log calls and play recordings',
        scope: 'phone-integration'
      },
      {
        title: 'Video Calls',
        description: 'Register as video call provider and create conference links',
        scope: 'video-calls'
      },
      {
        title: 'Messengers Integration',
        description: 'Register as messaging integration provider',
        scope: 'messengers-integration'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://oauth.pipedrive.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response: any;
      try {
        response = await http.post(
          'https://oauth.pipedrive.com/oauth/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw pipedriveApiError(error, 'OAuth token exchange');
      }

      let data = response.data;
      if (!data?.access_token) {
        throw pipedriveServiceError(
          'Pipedrive OAuth token response did not include an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authType: 'oauth' as const,
          companyDomain: companyDomainFromApiDomain(data.api_domain)
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw pipedriveServiceError('No Pipedrive OAuth refresh token is available.');
      }

      let http = createAxios();

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let response: any;
      try {
        response = await http.post(
          'https://oauth.pipedrive.com/oauth/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw pipedriveApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
      if (!data?.access_token) {
        throw pipedriveServiceError(
          'Pipedrive OAuth refresh response did not include an access token.'
        );
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authType: 'oauth' as const,
          companyDomain:
            companyDomainFromApiDomain(data.api_domain) ?? ctx.output.companyDomain
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: `https://api.pipedrive.com/v1`
      });

      let response: any;
      try {
        response = await http.get('/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw pipedriveApiError(error, 'OAuth profile lookup');
      }

      let user = response.data?.data;

      return {
        profile: {
          id: user?.id?.toString(),
          email: user?.email,
          name: user?.name,
          imageUrl: user?.icon_url,
          companyId: user?.company_id?.toString(),
          companyName: user?.company_name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Pipedrive API token (found in Settings > Personal preferences > API)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'api_token' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios();

      let response: any;
      try {
        response = await http.get(`https://api.pipedrive.com/v1/users/me`, {
          headers: {
            'x-api-token': ctx.output.token
          }
        });
      } catch (error) {
        throw pipedriveApiError(error, 'API token profile lookup');
      }

      let user = response.data?.data;

      return {
        profile: {
          id: user?.id?.toString(),
          email: user?.email,
          name: user?.name,
          imageUrl: user?.icon_url,
          companyId: user?.company_id?.toString(),
          companyName: user?.company_name
        }
      };
    }
  });
