import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { gitLabApiError, gitLabServiceError } from './lib/errors';

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  instanceUrl: z.string(),
  redirectUri: z.string().optional()
});

type AuthOutput = z.infer<typeof outputSchema>;

let scopes = [
  {
    title: 'API',
    description:
      'Complete read/write access to the API, including all groups, projects, registries, and packages',
    scope: 'api'
  },
  { title: 'Read API', description: 'Read-only access to the API', scope: 'read_api' },
  {
    title: 'Read User',
    description: "Read-only access to the authenticated user's profile",
    scope: 'read_user'
  },
  {
    title: 'Read Repository',
    description: 'Read-only access to repositories via Git-over-HTTP',
    scope: 'read_repository'
  },
  {
    title: 'Write Repository',
    description: 'Read-write access to repositories via Git-over-HTTP',
    scope: 'write_repository'
  },
  {
    title: 'Read Registry',
    description: 'Read-only access to container registry images',
    scope: 'read_registry'
  },
  {
    title: 'Write Registry',
    description: 'Write access to container registry images',
    scope: 'write_registry'
  },
  {
    title: 'Create Runner',
    description: 'Permission to create runners',
    scope: 'create_runner'
  },
  {
    title: 'Manage Runner',
    description: 'Permission to manage runners',
    scope: 'manage_runner'
  },
  {
    title: 'AI Features',
    description: 'Access to GitLab Duo AI-related endpoints',
    scope: 'ai_features'
  },
  {
    title: 'OpenID',
    description:
      'Authenticate via OpenID Connect; read-only access to profile and group memberships',
    scope: 'openid'
  },
  {
    title: 'Profile',
    description: 'Read-only access to user profile via OpenID Connect',
    scope: 'profile'
  },
  {
    title: 'Email',
    description: "Read-only access to the user's primary email via OpenID Connect",
    scope: 'email'
  }
];

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function createGitlabOauth(opts: {
  name: string;
  key: string;
  hardcodedInstanceUrl: string | null;
}) {
  let inputSchema = opts.hardcodedInstanceUrl
    ? z.object({})
    : z.object({
        instanceUrl: z
          .string()
          .describe('Your self-hosted GitLab instance URL (e.g. https://gitlab.example.com).')
      });

  return {
    type: 'auth.oauth' as const,
    name: opts.name,
    key: opts.key,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.gitlab.com/ee/integration/oauth_provider.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.gitlab.com/ee/integration/oauth_provider.html#authorized-applications'
      }
    ],
    scopes,
    inputSchema,

    getAuthorizationUrl: async (ctx: any) => {
      let baseUrl = opts.hardcodedInstanceUrl
        ? opts.hardcodedInstanceUrl
        : normalizeBaseUrl(ctx.input.instanceUrl);

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `${baseUrl}/oauth/authorize?${params.toString()}`,
        input: opts.hardcodedInstanceUrl ? {} : { instanceUrl: ctx.input.instanceUrl }
      };
    },

    handleCallback: async (ctx: any) => {
      let baseUrl = opts.hardcodedInstanceUrl
        ? opts.hardcodedInstanceUrl
        : normalizeBaseUrl(ctx.input.instanceUrl);

      let oauthAxios = createAxios({ baseURL: baseUrl });

      let response: any;
      try {
        response = await oauthAxios.post(
          '/oauth/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            grant_type: 'authorization_code',
            redirect_uri: ctx.redirectUri
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      } catch (error) {
        throw gitLabApiError(error, 'OAuth token exchange');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          instanceUrl: baseUrl,
          redirectUri: ctx.redirectUri
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw gitLabServiceError('No refresh token available');
      }

      let baseUrl = ctx.output.instanceUrl
        ? normalizeBaseUrl(ctx.output.instanceUrl)
        : opts.hardcodedInstanceUrl || 'https://gitlab.com';

      let oauthAxios = createAxios({ baseURL: baseUrl });

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        grant_type: 'refresh_token'
      });
      if (ctx.output.redirectUri) {
        params.set('redirect_uri', ctx.output.redirectUri);
      }

      let response: any;
      try {
        response = await oauthAxios.post('/oauth/token', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } catch (error) {
        throw gitLabApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          instanceUrl: baseUrl,
          redirectUri: ctx.output.redirectUri
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: any; scopes: string[] }) => {
      let baseUrl = normalizeBaseUrl(ctx.output.instanceUrl);
      let apiAxios = createAxios({ baseURL: `${baseUrl}/api/v4` });
      let response: any;
      try {
        response = await apiAxios.get('/user', {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });
      } catch (error) {
        throw gitLabApiError(error, 'get OAuth profile');
      }
      let data = response.data;
      return {
        profile: {
          id: String(data.id),
          email: data.email,
          name: data.name,
          imageUrl: data.avatar_url,
          username: data.username,
          webUrl: data.web_url
        }
      };
    }
  };
}

function createGitlabPat(opts: {
  name: string;
  key: string;
  hardcodedInstanceUrl: string | null;
}) {
  let inputSchema = opts.hardcodedInstanceUrl
    ? z.object({
        token: z.string().describe('GitLab personal, project, or group access token')
      })
    : z.object({
        token: z.string().describe('GitLab personal, project, or group access token'),
        instanceUrl: z
          .string()
          .describe('Your self-hosted GitLab instance URL (e.g. https://gitlab.example.com).')
      });

  return {
    type: 'auth.token' as const,
    name: opts.name,
    key: opts.key,
    inputSchema,

    getOutput: async (ctx: any) => {
      let instanceUrl = opts.hardcodedInstanceUrl
        ? opts.hardcodedInstanceUrl
        : normalizeBaseUrl(ctx.input.instanceUrl);
      return {
        output: {
          token: ctx.input.token,
          instanceUrl
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: any }) => {
      let baseUrl = normalizeBaseUrl(ctx.output.instanceUrl);
      let apiAxios = createAxios({ baseURL: `${baseUrl}/api/v4` });
      let response: any;
      try {
        response = await apiAxios.get('/user', {
          headers: { 'PRIVATE-TOKEN': ctx.output.token }
        });
      } catch (error) {
        throw gitLabApiError(error, 'get token profile');
      }
      let data = response.data;
      return {
        profile: {
          id: String(data.id),
          email: data.email,
          name: data.name,
          imageUrl: data.avatar_url,
          username: data.username,
          webUrl: data.web_url
        }
      };
    }
  };
}

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(
    createGitlabOauth({
      name: 'GitLab.com',
      key: 'oauth_gitlab_com',
      hardcodedInstanceUrl: 'https://gitlab.com'
    })
  )
  .addOauth(
    createGitlabOauth({
      name: 'Self-Hosted',
      key: 'oauth_self_hosted',
      hardcodedInstanceUrl: null
    })
  )
  .addTokenAuth(
    createGitlabPat({
      name: 'Personal Access Token (GitLab.com)',
      key: 'pat_gitlab_com',
      hardcodedInstanceUrl: 'https://gitlab.com'
    })
  )
  .addTokenAuth(
    createGitlabPat({
      name: 'Personal Access Token (Self-Hosted)',
      key: 'pat_self_hosted',
      hardcodedInstanceUrl: null
    })
  );
