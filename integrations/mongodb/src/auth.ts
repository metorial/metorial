import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let atlasAxios = createAxios({
  baseURL: 'https://cloud.mongodb.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      publicKey: z.string().optional(),
      privateKey: z.string().optional(),
      authMethod: z.enum(['oauth', 'digest'])
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
      // MongoDB Atlas OAuth uses client_credentials flow (no user redirect needed)
      // We return a token URL that the platform will handle
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://cloud.mongodb.com/api/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let tokenResponse = await atlasAxios.post(
        'https://cloud.mongodb.com/api/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          token: tokenResponse.data.access_token,
          authMethod: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      // MongoDB Atlas service accounts use client_credentials - get a new token
      let tokenResponse = await atlasAxios.post(
        'https://cloud.mongodb.com/api/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          scope: ctx.scopes.join(' ')
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: {
          token: tokenResponse.data.access_token,
          authMethod: 'oauth' as const
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
      // Verify the credentials work by making a test request
      let credentials = btoa(`${ctx.input.publicKey}:${ctx.input.privateKey}`);

      // Test the credentials
      await atlasAxios.get('/api/atlas/v2/orgs', {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/vnd.atlas.2025-03-12+json'
        }
      });

      return {
        output: {
          token: credentials,
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
      let response = await atlasAxios.get('/api/atlas/v2/orgs', {
        headers: {
          Authorization: `Basic ${ctx.output.token}`,
          Accept: 'application/vnd.atlas.2025-03-12+json'
        }
      });

      let orgs = response.data.results || [];
      let firstOrg = orgs[0];

      return {
        profile: {
          id: firstOrg?.id,
          name: firstOrg?.name
        }
      };
    }
  });
