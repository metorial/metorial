import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let oauthAxios = createAxios({
  baseURL: 'https://app.productboard.com'
});

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
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.productboard.com/reference/oauth-authorization-code'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.productboard.com/reference/oauth-authorization-code#access-scopes'
      }
    ],

    scopes: [
      {
        title: 'Read Product Hierarchy',
        description: 'Read products, components, features, and their attributes',
        scope: 'product_hierarchy_data:read'
      },
      {
        title: 'Create Product Hierarchy',
        description: 'Create features, releases, roadmaps',
        scope: 'product_hierarchy_data:create'
      },
      {
        title: 'Manage Product Hierarchy',
        description: 'Edit and delete features and attributes',
        scope: 'product_hierarchy_data:manage'
      },
      {
        title: 'Read Custom Fields',
        description: 'Read custom field definitions',
        scope: 'custom_fields:read'
      },
      {
        title: 'Read Releases',
        description: 'Read releases and release groups',
        scope: 'releases:read'
      },
      {
        title: 'Create Releases',
        description: 'Create releases and release groups',
        scope: 'releases:create'
      },
      {
        title: 'Manage Releases',
        description: 'Edit and delete releases and release groups',
        scope: 'releases:manage'
      },
      {
        title: 'Create Notes',
        description: 'Create notes (feedback)',
        scope: 'notes:create'
      },
      {
        title: 'Read Users',
        description: 'List users',
        scope: 'users:read'
      },
      {
        title: 'Manage Users',
        description: 'Edit users',
        scope: 'users:manage'
      },
      {
        title: 'Read User PII',
        description: 'Read PII from note-creating users',
        scope: 'users_pii:read'
      },
      {
        title: 'Read Member PII',
        description: 'Read PII from workspace members',
        scope: 'members_pii:read'
      },
      {
        title: 'Manage Plugin Integrations',
        description: 'Manage UI plugins',
        scope: 'plugin_integrations:manage'
      },
      {
        title: 'Read Objectives',
        description: 'Read objectives',
        scope: 'objectives:read'
      },
      {
        title: 'Create Objectives',
        description: 'Create objectives',
        scope: 'objectives:create'
      },
      {
        title: 'Manage Objectives',
        description: 'Edit and delete objectives',
        scope: 'objectives:manage'
      },
      {
        title: 'Read Key Results',
        description: 'Read key results',
        scope: 'key_results:read'
      },
      {
        title: 'Create Key Results',
        description: 'Create key results',
        scope: 'key_results:create'
      },
      {
        title: 'Manage Key Results',
        description: 'Edit and delete key results',
        scope: 'key_results:manage'
      },
      {
        title: 'Read Initiatives',
        description: 'Read initiatives',
        scope: 'initiatives:read'
      },
      {
        title: 'Create Initiatives',
        description: 'Create initiatives',
        scope: 'initiatives:create'
      },
      {
        title: 'Manage Initiatives',
        description: 'Edit and delete initiatives',
        scope: 'initiatives:manage'
      },
      {
        title: 'Read Feedback Form Configs',
        description: 'Read feedback form configurations',
        scope: 'feedback_form_configurations:read'
      },
      {
        title: 'Submit Feedback Forms',
        description: 'Submit notes via feedback forms',
        scope: 'feedback_forms:create'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://app.productboard.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await oauthAxios.post(
        '/oauth2/token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await oauthAxios.post(
        '/oauth2/token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string().describe('Productboard API access token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
