import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  instanceUrl: z.string()
});

type AuthOutput = z.infer<typeof outputSchema>;

let scopes = [
  {
    title: 'Repository',
    description: 'Full access to public and private repositories',
    scope: 'repo'
  },
  {
    title: 'Repository Status',
    description: 'Read/write access to commit statuses',
    scope: 'repo:status'
  },
  {
    title: 'Public Repository',
    description: 'Access to public repositories only',
    scope: 'public_repo'
  },
  {
    title: 'Admin: Organization',
    description: 'Full management of organizations and teams',
    scope: 'admin:org'
  },
  {
    title: 'Write Organization',
    description: 'Write access to organization membership',
    scope: 'write:org'
  },
  {
    title: 'Read Organization',
    description: 'Read access to organization membership',
    scope: 'read:org'
  },
  {
    title: 'Admin: Repo Hook',
    description: 'Full access to repository webhooks',
    scope: 'admin:repo_hook'
  },
  {
    title: 'Admin: Org Hook',
    description: 'Full access to organization webhooks',
    scope: 'admin:org_hook'
  },
  {
    title: 'User',
    description: 'Read/write access to user profile, email, and follow',
    scope: 'user'
  },
  {
    title: 'User Email',
    description: 'Read access to email addresses',
    scope: 'user:email'
  },
  {
    title: 'Gist',
    description: 'Write access to gists',
    scope: 'gist'
  },
  {
    title: 'Notifications',
    description: 'Access to notifications',
    scope: 'notifications'
  },
  {
    title: 'Workflow',
    description: 'Manage GitHub Actions workflow files',
    scope: 'workflow'
  },
  {
    title: 'Write Packages',
    description: 'Upload packages to GitHub Packages',
    scope: 'write:packages'
  },
  {
    title: 'Read Packages',
    description: 'Download packages from GitHub Packages',
    scope: 'read:packages'
  },
  {
    title: 'Delete Packages',
    description: 'Delete packages from GitHub Packages',
    scope: 'delete:packages'
  },
  {
    title: 'Project',
    description: 'Full access to user and organization projects',
    scope: 'project'
  },
  {
    title: 'Read Project',
    description: 'Read-only access to user and organization projects',
    scope: 'read:project'
  },
  {
    title: 'Delete Repository',
    description: 'Delete repositories',
    scope: 'delete_repo'
  },
  {
    title: 'Security Events',
    description: 'Access to code scanning API',
    scope: 'security_events'
  },
  {
    title: 'Read Audit Log',
    description: 'Read audit log data',
    scope: 'read:audit_log'
  }
];

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function getApiBaseUrl(instanceUrl: string) {
  let baseUrl = normalizeBaseUrl(instanceUrl);
  return baseUrl === 'https://github.com' ? 'https://api.github.com' : `${baseUrl}/api/v3`;
}

function createGithubOauth(opts: {
  name: string;
  key: string;
  hardcodedInstanceUrl: string | null;
}) {
  let inputSchema = opts.hardcodedInstanceUrl
    ? z.object({})
    : z.object({
        instanceUrl: z
          .string()
          .describe('Your GitHub Enterprise URL (e.g. https://github.example.com).')
      });

  return {
    type: 'auth.oauth' as const,
    name: opts.name,
    key: opts.key,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes'
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
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `${baseUrl}/login/oauth/authorize?${params.toString()}`,
        input: opts.hardcodedInstanceUrl ? {} : { instanceUrl: ctx.input.instanceUrl }
      };
    },

    handleCallback: async (ctx: any) => {
      let baseUrl = opts.hardcodedInstanceUrl
        ? opts.hardcodedInstanceUrl
        : normalizeBaseUrl(ctx.input.instanceUrl);

      let http = createAxios({ baseURL: baseUrl });
      let response = await http.post(
        '/login/oauth/access_token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          instanceUrl: baseUrl
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let baseUrl = ctx.output.instanceUrl
        ? normalizeBaseUrl(ctx.output.instanceUrl)
        : opts.hardcodedInstanceUrl || 'https://github.com';

      let http = createAxios({ baseURL: baseUrl });
      let response = await http.post(
        '/login/oauth/access_token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          instanceUrl: baseUrl
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      let http = createAxios({
        baseURL: getApiBaseUrl(ctx.output.instanceUrl),
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.github+json'
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? user.login,
          imageUrl: user.avatar_url
        }
      };
    }
  } as any;
}

function createGithubPat(opts: {
  name: string;
  key: string;
  hardcodedInstanceUrl: string | null;
}) {
  let inputSchema = opts.hardcodedInstanceUrl
    ? z.object({
        token: z.string().describe('GitHub Personal Access Token (classic or fine-grained)')
      })
    : z.object({
        token: z.string().describe('GitHub Personal Access Token (classic or fine-grained)'),
        instanceUrl: z
          .string()
          .describe('Your GitHub Enterprise URL (e.g. https://github.example.com).')
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

    getProfile: async (ctx: { output: AuthOutput }) => {
      let http = createAxios({
        baseURL: getApiBaseUrl(ctx.output.instanceUrl),
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.github+json'
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email ?? undefined,
          name: user.name ?? user.login,
          imageUrl: user.avatar_url
        }
      };
    }
  } as any;
}

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(
    createGithubOauth({
      name: 'GitHub.com',
      key: 'oauth',
      hardcodedInstanceUrl: 'https://github.com'
    })
  )
  .addOauth(
    createGithubOauth({
      name: 'Enterprise',
      key: 'oauth_enterprise',
      hardcodedInstanceUrl: null
    })
  )
  .addTokenAuth(
    createGithubPat({
      name: 'Personal Access Token (GitHub.com)',
      key: 'personal_access_token',
      hardcodedInstanceUrl: 'https://github.com'
    })
  )
  .addTokenAuth(
    createGithubPat({
      name: 'Personal Access Token (Enterprise)',
      key: 'pat_enterprise',
      hardcodedInstanceUrl: null
    })
  );
