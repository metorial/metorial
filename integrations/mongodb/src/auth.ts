import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { AtlasClient } from './lib/client';
import { mongodbApiError, mongodbServiceError } from './lib/errors';

let atlasAxios = createAxios({
  baseURL: 'https://cloud.mongodb.com'
});

let exchangeServiceAccountToken = async (ctx: {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}) => {
  try {
    let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');
    let params = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    if (ctx.scopes && ctx.scopes.length > 0) {
      params.set('scope', ctx.scopes.join(' '));
    }

    let tokenResponse = await atlasAxios.post('/api/oauth/token', params.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      }
    });

    let tokenData = tokenResponse.data as {
      access_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      throw mongodbServiceError('MongoDB Atlas token response did not include access_token.');
    }

    return {
      accessToken: tokenData.access_token,
      expiresAt: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString()
    };
  } catch (error) {
    throw mongodbApiError(error, 'service account token exchange');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      publicKey: z.string().optional(),
      privateKey: z.string().optional(),
      authMethod: z.enum(['oauth', 'digest']),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 Service Account',
    key: 'oauth',

    scopes: [
      {
        title: 'Organization Owner',
        description: 'Full access to manage the organization and all its projects',
        scope: 'org:owner'
      },
      {
        title: 'Organization Member',
        description: 'Read access to organization resources',
        scope: 'org:member'
      },
      {
        title: 'Organization Read Only',
        description: 'Read-only access to organization settings and projects',
        scope: 'org:read'
      },
      {
        title: 'Project Owner',
        description: 'Full access to manage a project and its resources',
        scope: 'project:owner'
      },
      {
        title: 'Project Read Only',
        description: 'Read-only access to project resources',
        scope: 'project:read'
      },
      {
        title: 'Project Cluster Manager',
        description: 'Create, edit, and delete clusters within a project',
        scope: 'project:cluster_manager'
      },
      {
        title: 'Project Data Access Admin',
        description: 'Manage database users and access within a project',
        scope: 'project:data_access_admin'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let token = await exchangeServiceAccountToken(ctx);
      let callbackUrl = new URL(ctx.redirectUri);
      callbackUrl.searchParams.set('code', 'client_credentials');
      callbackUrl.searchParams.set('state', ctx.state);

      return {
        url: callbackUrl.toString(),
        callbackState: token
      };
    },

    handleCallback: async ctx => {
      let callbackToken = ctx.callbackState as
        | { accessToken?: string; expiresAt?: string }
        | undefined;
      let token = callbackToken?.accessToken
        ? {
            accessToken: callbackToken.accessToken,
            expiresAt: callbackToken.expiresAt
          }
        : await exchangeServiceAccountToken(ctx);

      return {
        output: {
          token: token.accessToken,
          authMethod: 'oauth' as const,
          expiresAt: token.expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let token = await exchangeServiceAccountToken(ctx);

      return {
        output: {
          token: token.accessToken,
          authMethod: 'oauth' as const,
          expiresAt: token.expiresAt
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key (Digest Auth)',
    key: 'api_key_digest',

    inputSchema: z.object({
      publicKey: z.string().describe('MongoDB Atlas API Public Key'),
      privateKey: z.string().describe('MongoDB Atlas API Private Key')
    }),

    getOutput: async ctx => {
      let client = new AtlasClient({
        token: ctx.input.publicKey,
        publicKey: ctx.input.publicKey,
        privateKey: ctx.input.privateKey,
        authMethod: 'digest'
      });
      await client.listOrganizations({ itemsPerPage: 1 });

      return {
        output: {
          token: ctx.input.publicKey,
          publicKey: ctx.input.publicKey,
          privateKey: ctx.input.privateKey,
          authMethod: 'digest' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        publicKey?: string;
        privateKey?: string;
        authMethod: 'oauth' | 'digest';
      };
      input: { publicKey: string; privateKey: string };
    }) => {
      let client = new AtlasClient({
        token: ctx.output.publicKey || ctx.output.token,
        publicKey: ctx.output.publicKey || ctx.input.publicKey,
        privateKey: ctx.output.privateKey || ctx.input.privateKey,
        authMethod: 'digest'
      });

      let response = await client.listOrganizations({ itemsPerPage: 1 });
      let orgs = response.results || [];
      let firstOrg = orgs[0];

      return {
        profile: {
          id: firstOrg?.id,
          name: firstOrg?.name
        }
      };
    }
  });
