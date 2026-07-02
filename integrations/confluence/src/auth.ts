import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { confluenceApiError, confluenceServiceError } from './lib/errors';

let ax = createAxios();

let authRequest = async <T>(operation: string, run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    throw confluenceApiError(error, operation);
  }
};

let normalizeCloudBaseUrl = (domain: string) => {
  let host = domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

  if (!host.endsWith('.atlassian.net')) {
    host = `${host}.atlassian.net`;
  }

  return `https://${host}`;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      cloudId: z.string().describe('Confluence Cloud site ID').optional(),
      baseUrl: z.string().describe('Confluence site base URL').optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 (Confluence Cloud)',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.atlassian.com/cloud/confluence/scopes-for-oauth-2-3LO-and-forge-apps/'
      }
    ],

    scopes: [
      {
        title: 'Read Content',
        description: 'Read all Confluence content including page and blog post bodies',
        scope: 'read:confluence-content.all'
      },
      {
        title: 'Read Content Summary',
        description: 'Read Confluence content summaries',
        scope: 'read:confluence-content.summary'
      },
      {
        title: 'Write Content',
        description: 'Create and update pages, blog posts, and comments',
        scope: 'write:confluence-content'
      },
      {
        title: 'Write Space',
        description: 'Create and manage Confluence spaces',
        scope: 'write:confluence-space'
      },
      {
        title: 'Read Space Summary',
        description: 'Read Confluence space summaries',
        scope: 'read:confluence-space.summary'
      },
      {
        title: 'Write File',
        description: 'Upload and manage file attachments',
        scope: 'write:confluence-file'
      },
      {
        title: 'Read Properties',
        description: 'Read content properties',
        scope: 'read:confluence-props'
      },
      {
        title: 'Write Properties',
        description: 'Create and update content properties',
        scope: 'write:confluence-props'
      },
      {
        title: 'Search',
        description: 'Search Confluence content using CQL',
        scope: 'search:confluence'
      },
      {
        title: 'Read Content Permissions',
        description: 'View content permissions in Confluence',
        scope: 'read:confluence-content.permission'
      },
      {
        title: 'Read User',
        description: 'Read user profile information',
        scope: 'read:confluence-user'
      },
      {
        title: 'Read Groups',
        description: 'Read group information and membership',
        scope: 'read:confluence-groups'
      },
      {
        title: 'Write Groups',
        description: 'Create and manage groups',
        scope: 'write:confluence-groups'
      },
      {
        title: 'Manage Configuration',
        description: 'Manage global Confluence configuration settings',
        scope: 'manage:confluence-configuration'
      },
      {
        title: 'Read Attachments',
        description: 'Download file attachments',
        scope: 'readonly:content.attachment:confluence'
      },
      {
        title: 'Offline Access',
        description: 'Enable refresh tokens for long-lived access',
        scope: 'offline_access'
      },
      {
        title: 'Read Pages (v2)',
        description: 'Read pages via the Confluence v2 API',
        scope: 'read:page:confluence'
      },
      {
        title: 'Write Pages (v2)',
        description: 'Create and update pages via the Confluence v2 API',
        scope: 'write:page:confluence'
      },
      {
        title: 'Delete Pages (v2)',
        description: 'Delete pages via the Confluence v2 API',
        scope: 'delete:page:confluence'
      },
      {
        title: 'Read Blog Posts (v2)',
        description: 'Read blog posts via the Confluence v2 API',
        scope: 'read:blogpost:confluence'
      },
      {
        title: 'Write Blog Posts (v2)',
        description: 'Create and update blog posts via the Confluence v2 API',
        scope: 'write:blogpost:confluence'
      },
      {
        title: 'Delete Blog Posts (v2)',
        description: 'Delete blog posts via the Confluence v2 API',
        scope: 'delete:blogpost:confluence'
      },
      {
        title: 'Read Spaces (v2)',
        description: 'Read spaces via the Confluence v2 API',
        scope: 'read:space:confluence'
      },
      {
        title: 'Read Content (v2)',
        description: 'Read content including blog posts via the Confluence v2 API',
        scope: 'read:content:confluence'
      },
      {
        title: 'Write Content (v2)',
        description: 'Create and update content via the Confluence v2 API',
        scope: 'write:content:confluence'
      },
      {
        title: 'Delete Content (v2)',
        description: 'Delete content via the Confluence v2 API',
        scope: 'delete:content:confluence'
      },
      {
        title: 'Read Comments (v2)',
        description: 'Read comments via the Confluence v2 API',
        scope: 'read:comment:confluence'
      },
      {
        title: 'Write Comments (v2)',
        description: 'Create and delete comments via the Confluence v2 API',
        scope: 'write:comment:confluence'
      },
      {
        title: 'Delete Comments (v2)',
        description: 'Delete comments via the Confluence v2 API',
        scope: 'delete:comment:confluence'
      },
      {
        title: 'Read Attachments (v2)',
        description: 'Read attachments via the Confluence v2 API',
        scope: 'read:attachment:confluence'
      },
      {
        title: 'Write Attachments (v2)',
        description: 'Upload and update attachments via the Confluence APIs',
        scope: 'write:attachment:confluence'
      },
      {
        title: 'Delete Attachments (v2)',
        description: 'Delete attachments via the Confluence v2 API',
        scope: 'delete:attachment:confluence'
      },
      {
        title: 'Read Content Metadata (v2)',
        description: 'Read content metadata via the Confluence v2 API',
        scope: 'read:content-details:confluence'
      },
      {
        title: 'Read Hierarchical Content (v2)',
        description: 'Read page children and other content tree relationships',
        scope: 'read:hierarchical-content:confluence'
      },
      {
        title: 'Read Labels (v2)',
        description: 'Read labels on Confluence content',
        scope: 'read:label:confluence'
      },
      {
        title: 'Write Labels (v2)',
        description: 'Add and remove labels on Confluence content',
        scope: 'write:label:confluence'
      },
      {
        title: 'Read Content Properties (v2)',
        description: 'Read content properties via the Confluence v2 API',
        scope: 'read:content.property:confluence'
      },
      {
        title: 'Write Content Properties (v2)',
        description: 'Create, update, and delete content properties via the Confluence v2 API',
        scope: 'write:content.property:confluence'
      },
      {
        title: 'Read Content Restrictions',
        description: 'Read content restrictions',
        scope: 'read:content.restriction:confluence'
      },
      {
        title: 'Write Content Restrictions',
        description: 'Create, update, and delete content restrictions',
        scope: 'write:content.restriction:confluence'
      },
      {
        title: 'Read Content Permissions',
        description: 'Check content permissions via the Confluence API',
        scope: 'read:content.permission:confluence'
      },
      {
        title: 'Read Users (v2)',
        description: 'Read user details via the Confluence API',
        scope: 'read:user:confluence'
      },
      {
        title: 'Read Groups (v2)',
        description: 'Read group details via the Confluence API',
        scope: 'read:group:confluence'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        audience: 'api.atlassian.com',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        prompt: 'consent'
      });

      return {
        url: `https://auth.atlassian.com/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let tokenResponse = await authRequest('exchange OAuth authorization code', () =>
        ax.post('https://auth.atlassian.com/oauth/token', {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        })
      );

      let accessToken = tokenResponse.data.access_token as string;
      let refreshToken = tokenResponse.data.refresh_token as string | undefined;
      let expiresIn = tokenResponse.data.expires_in as number | undefined;

      let expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : undefined;

      // Fetch the cloud ID from accessible resources
      let resourcesResponse = await authRequest('list accessible Confluence sites', () =>
        ax.get('https://api.atlassian.com/oauth/token/accessible-resources', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      );

      let resources = resourcesResponse.data as Array<{
        id: string;
        name: string;
        url: string;
      }>;
      let cloudId = resources.length > 0 ? resources[0]!.id : undefined;
      if (!cloudId) {
        throw confluenceServiceError(
          'No accessible Confluence Cloud site was returned for this OAuth grant.'
        );
      }

      return {
        output: {
          token: accessToken,
          refreshToken,
          expiresAt,
          cloudId
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        cloudId?: string;
        baseUrl?: string;
      };
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken) {
        throw confluenceServiceError(
          'No refresh token available. Ensure the offline_access scope is included.'
        );
      }

      let tokenResponse = await authRequest('refresh OAuth token', () =>
        ax.post('https://auth.atlassian.com/oauth/token', {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        })
      );

      let accessToken = tokenResponse.data.access_token as string;
      let refreshToken =
        (tokenResponse.data.refresh_token as string | undefined) || ctx.output.refreshToken;
      let expiresIn = tokenResponse.data.expires_in as number | undefined;

      let expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: accessToken,
          refreshToken,
          expiresAt,
          cloudId: ctx.output.cloudId
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        cloudId?: string;
        baseUrl?: string;
      };
      input: {};
      scopes: string[];
    }) => {
      if (!ctx.output.cloudId) {
        throw confluenceServiceError(
          'No Confluence Cloud site ID is available for this OAuth grant.'
        );
      }

      let response = await authRequest('load Confluence current user', () =>
        ax.get(
          `https://api.atlassian.com/ex/confluence/${ctx.output.cloudId}/wiki/rest/api/user/current`,
          {
            headers: { Authorization: `Bearer ${ctx.output.token}` }
          }
        )
      );

      let data = response.data as {
        accountId: string;
        email?: string;
        displayName: string;
        profilePicture?: { path: string };
      };

      return {
        profile: {
          id: data.accountId,
          email: data.email,
          name: data.displayName,
          imageUrl: data.profilePicture?.path
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token (Confluence Cloud)',
    key: 'api_token',

    inputSchema: z.object({
      email: z.string().describe('Atlassian account email address'),
      token: z
        .string()
        .describe(
          'API token generated from https://id.atlassian.com/manage-profile/security/api-tokens'
        ),
      domain: z
        .string()
        .describe('Atlassian domain (e.g., "mycompany" for mycompany.atlassian.net)')
    }),

    getOutput: async (ctx: { input: { email: string; token: string; domain: string } }) => {
      let credentials = btoa(`${ctx.input.email}:${ctx.input.token}`);
      let baseUrl = normalizeCloudBaseUrl(ctx.input.domain);

      let tenantInfo = await authRequest('resolve Confluence Cloud site', () =>
        ax.get(`${baseUrl}/_edge/tenant_info`)
      );
      let cloudId = (tenantInfo.data as { cloudId?: string }).cloudId;
      if (!cloudId) {
        throw confluenceServiceError(
          `Could not resolve cloudId for domain "${ctx.input.domain}". Verify the domain is correct (e.g., "mycompany" for mycompany.atlassian.net).`
        );
      }

      return {
        output: {
          token: credentials,
          cloudId,
          baseUrl
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; baseUrl?: string };
      input: { email: string; token: string; domain: string };
    }) => {
      let baseUrl = ctx.output.baseUrl || normalizeCloudBaseUrl(ctx.input.domain);
      let response = await authRequest('load Confluence current user', () =>
        ax.get(`${baseUrl}/wiki/rest/api/user/current`, {
          headers: { Authorization: `Basic ${ctx.output.token}` }
        })
      );

      let data = response.data as {
        accountId: string;
        email: string;
        displayName: string;
        profilePicture?: { path: string };
      };

      return {
        profile: {
          id: data.accountId,
          email: data.email,
          name: data.displayName,
          imageUrl: data.profilePicture?.path
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token (Data Center)',
    key: 'pat',

    inputSchema: z.object({
      token: z.string().describe('Personal access token for Confluence Data Center'),
      baseUrl: z
        .string()
        .describe(
          'Base URL of your Confluence Data Center instance (e.g., https://confluence.example.com)'
        )
    }),

    getOutput: async (ctx: { input: { token: string; baseUrl: string } }) => {
      return {
        output: {
          token: ctx.input.token,
          baseUrl: ctx.input.baseUrl.replace(/\/$/, '')
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; baseUrl?: string };
      input: { token: string; baseUrl: string };
    }) => {
      let baseUrl = (ctx.output.baseUrl || ctx.input.baseUrl).replace(/\/$/, '');
      let response = await authRequest('load Confluence Data Center current user', () =>
        ax.get(`${baseUrl}/rest/api/user/current`, {
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        })
      );

      let data = response.data as { username: string; displayName: string; userKey: string };

      return {
        profile: {
          id: data.userKey,
          name: data.displayName
        }
      };
    }
  });
