import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { adobeSignRequest, adobeSignServiceError } from './lib/errors';

let scopes = [
  { title: 'Read Users', description: 'Read user information', scope: 'user_read:account' },
  {
    title: 'Write Users',
    description: 'Create and update users',
    scope: 'user_write:account'
  },
  { title: 'User Login', description: 'Login on behalf of a user', scope: 'user_login:self' },
  {
    title: 'Read Agreements',
    description: 'Read agreement details and status',
    scope: 'agreement_read:account'
  },
  {
    title: 'Write Agreements',
    description: 'Create and modify agreements',
    scope: 'agreement_write:account'
  },
  {
    title: 'Send Agreements',
    description: 'Send agreements for signature',
    scope: 'agreement_send:account'
  },
  {
    title: 'Agreement Retention',
    description: 'Delete agreement documents',
    scope: 'agreement_retention:account'
  },
  {
    title: 'Read Library Templates',
    description: 'Read library document templates',
    scope: 'library_read:account'
  },
  {
    title: 'Write Library Templates',
    description: 'Create and modify library templates',
    scope: 'library_write:account'
  },
  {
    title: 'Read Workflows',
    description: 'Read workflow details',
    scope: 'workflow_read:account'
  },
  {
    title: 'Write Workflows',
    description: 'Create and modify workflows',
    scope: 'workflow_write:account'
  },
  {
    title: 'Read Web Forms',
    description: 'Read web form details',
    scope: 'widget_read:account'
  },
  {
    title: 'Write Web Forms',
    description: 'Create and modify web forms',
    scope: 'widget_write:account'
  },
  {
    title: 'Read Webhooks',
    description: 'Read webhook configurations',
    scope: 'webhook_read:account'
  },
  {
    title: 'Write Webhooks',
    description: 'Create and modify webhooks',
    scope: 'webhook_write:account'
  },
  {
    title: 'Webhook Retention',
    description: 'Delete webhooks',
    scope: 'webhook_retention:account'
  }
];

let SHARDS = ['na1', 'na2', 'na4', 'eu1', 'eu2', 'jp1', 'au1', 'in1'] as const;
type Shard = (typeof SHARDS)[number];

function createAdobeSignOauth(name: string, key: string, shard: Shard) {
  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let scopeString = ctx.scopes.join('+');
      let url = `https://secure.${shard}.adobesign.com/public/oauth/v2?response_type=code&client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}&scope=${encodeURIComponent(scopeString)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },

    handleCallback: async (ctx: any) => {
      let ax = createAxios({ baseURL: `https://api.${shard}.adobesign.com` });
      let tokenResponse = await adobeSignRequest('OAuth token exchange', () =>
        ax.post(
          '/oauth/v2/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      );
      let data = tokenResponse.data;
      if (!data.access_token) {
        throw adobeSignServiceError(
          'Adobe Acrobat Sign OAuth response did not include an access token.'
        );
      }

      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      let baseUriResponse = await adobeSignRequest('base URI lookup', () =>
        ax.get('/api/rest/v6/baseUris', {
          headers: { Authorization: `Bearer ${data.access_token}` }
        })
      );
      let apiBaseUrl =
        baseUriResponse.data.apiAccessPoint || `https://api.${shard}.adobesign.com/`;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          apiBaseUrl,
          shard
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw adobeSignServiceError('No Adobe Acrobat Sign refresh token is available.');
      }

      let ax = createAxios({ baseURL: `https://api.${shard}.adobesign.com` });
      let refreshResponse = await adobeSignRequest('OAuth token refresh', () =>
        ax.post(
          '/oauth/v2/refresh',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )
      );
      let data = refreshResponse.data;
      if (!data.access_token) {
        throw adobeSignServiceError(
          'Adobe Acrobat Sign refresh response did not include an access token.'
        );
      }

      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          apiBaseUrl: ctx.output.apiBaseUrl,
          shard
        }
      };
    },

    getProfile: async (ctx: any) => {
      let baseUrl = ctx.output.apiBaseUrl || `https://api.${shard}.adobesign.com/`;
      let ax = createAxios({ baseURL: baseUrl });
      let response = await adobeSignRequest('profile lookup', () =>
        ax.get('/api/rest/v6/users/me', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        })
      );
      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          company: user.company
        }
      };
    }
  };
}

function createAdobeSignIntegrationKey(name: string, key: string, shard: Shard) {
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      integrationKey: z
        .string()
        .describe(
          'Non-expiring integration key from Adobe Sign admin UI (for development/testing only)'
        )
    }),
    getOutput: async (ctx: { input: { integrationKey: string } }) => {
      if (!ctx.input.integrationKey.trim()) {
        throw adobeSignServiceError('integrationKey is required.');
      }

      let ax = createAxios({ baseURL: `https://api.${shard}.adobesign.com` });
      let baseUriResponse = await adobeSignRequest('base URI lookup', () =>
        ax.get('/api/rest/v6/baseUris', {
          headers: { Authorization: `Bearer ${ctx.input.integrationKey}` }
        })
      );
      let apiBaseUrl =
        baseUriResponse.data.apiAccessPoint || `https://api.${shard}.adobesign.com/`;
      return {
        output: {
          token: ctx.input.integrationKey,
          apiBaseUrl,
          shard
        }
      };
    },
    getProfile: async (ctx: any) => {
      let baseUrl = ctx.output.apiBaseUrl || `https://api.${shard}.adobesign.com/`;
      let ax = createAxios({ baseURL: baseUrl });
      let response = await adobeSignRequest('profile lookup', () =>
        ax.get('/api/rest/v6/users/me', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        })
      );
      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          company: user.company
        }
      };
    }
  };
}

let shardLabel: Record<Shard, string> = {
  na1: 'North America 1',
  na2: 'North America 2',
  na4: 'North America 4',
  eu1: 'Europe 1',
  eu2: 'Europe 2',
  jp1: 'Japan 1',
  au1: 'Australia 1',
  in1: 'India 1'
};

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  apiBaseUrl: z.string().optional(),
  shard: z.enum(SHARDS)
});

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.na1} (na1)`, 'oauth_na1', 'na1'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.na2} (na2)`, 'oauth_na2', 'na2'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.na4} (na4)`, 'oauth_na4', 'na4'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.eu1} (eu1)`, 'oauth_eu1', 'eu1'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.eu2} (eu2)`, 'oauth_eu2', 'eu2'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.jp1} (jp1)`, 'oauth_jp1', 'jp1'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.au1} (au1)`, 'oauth_au1', 'au1'))
  .addOauth(createAdobeSignOauth(`OAuth 2.0 — ${shardLabel.in1} (in1)`, 'oauth_in1', 'in1'))
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.na1} (na1)`,
      'integration_key_na1',
      'na1'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.na2} (na2)`,
      'integration_key_na2',
      'na2'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.na4} (na4)`,
      'integration_key_na4',
      'na4'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.eu1} (eu1)`,
      'integration_key_eu1',
      'eu1'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.eu2} (eu2)`,
      'integration_key_eu2',
      'eu2'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.jp1} (jp1)`,
      'integration_key_jp1',
      'jp1'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.au1} (au1)`,
      'integration_key_au1',
      'au1'
    )
  )
  .addTokenAuth(
    createAdobeSignIntegrationKey(
      `Integration Key — ${shardLabel.in1} (in1)`,
      'integration_key_in1',
      'in1'
    )
  );
