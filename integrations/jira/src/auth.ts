import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { jiraApiError, jiraServiceError } from './lib/errors';
import {
  fetchAccessibleJiraSites,
  type JiraSite,
  jiraSiteSchema,
  selectOauthJiraSite
} from './lib/site';

let outputSchema = z.object({
  token: z.string(),
  cloudId: z.string().describe('Jira Cloud site ID'),
  siteUrl: z.string().optional().describe('URL of the connected Jira site'),
  siteName: z.string().optional().describe('Name of the connected Jira site'),
  sites: z
    .array(jiraSiteSchema)
    .optional()
    .describe('All Atlassian sites this authorization can access'),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});

type AuthOutput = z.infer<typeof outputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',

    inputSchema: z.object({
      site: z
        .string()
        .optional()
        .describe(
          'Optional Jira site to connect when your Atlassian account can access several sites: the site URL (e.g. "https://mycompany.atlassian.net"), its subdomain ("mycompany"), or the site name. Leave blank to use the first site Atlassian returns.'
        )
    }),
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.atlassian.com/cloud/jira/software/oauth-2-3lo-apps/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.atlassian.com/cloud/jira/software/scopes-for-oauth-2-3LO-and-forge-apps/'
      }
    ],

    scopes: [
      {
        title: 'Read Jira Work',
        description: 'Read access to Jira projects, issues, worklogs, etc.',
        scope: 'read:jira-work'
      },
      {
        title: 'Read Jira Issue Details',
        description: 'Read detailed Jira Software issue data for sprint contents.',
        scope: 'read:issue-details:jira'
      },
      {
        title: 'Read Jira JQL',
        description: 'Read Jira JQL data used by Jira Software sprint issue queries.',
        scope: 'read:jql:jira'
      },
      {
        title: 'Write Jira Work',
        description: 'Write access to create/update issues, worklogs, etc.',
        scope: 'write:jira-work'
      },
      {
        title: 'Read Jira User',
        description: 'Read access to user information.',
        scope: 'read:jira-user'
      },
      {
        title: 'Manage Jira Project',
        description: 'Manage project settings.',
        scope: 'manage:jira-project'
      },
      {
        title: 'Manage Jira Configuration',
        description: 'Manage Jira global settings.',
        scope: 'manage:jira-configuration'
      },
      {
        title: 'Manage Jira Webhook',
        description: 'Manage webhooks for receiving event notifications.',
        scope: 'manage:jira-webhook'
      },
      {
        title: 'Offline Access',
        description: 'Enables refresh tokens for long-lived access.',
        scope: 'offline_access'
      },
      {
        title: 'Read Me',
        description: 'Read profile information for the authenticated user.',
        scope: 'read:me'
      },
      {
        title: 'Read Boards and Sprints',
        description: 'View boards, backlogs, sprints, and related items in Jira Software.',
        scope: 'read:board-scope:jira-software'
      },
      {
        title: 'Manage Boards',
        description: 'Create and manage Jira Software boards.',
        scope: 'write:board-scope:jira-software'
      },
      {
        title: 'Read Sprints',
        description: 'Read sprint data from Jira Software.',
        scope: 'read:sprint:jira-software'
      },
      {
        title: 'Manage Sprints',
        description: 'Create, update, and move issues to sprints.',
        scope: 'write:sprint:jira-software'
      },
      {
        title: 'Delete Sprints',
        description: 'Delete Jira Software sprints created during test cleanup.',
        scope: 'delete:sprint:jira-software'
      },
      {
        title: 'Read Projects',
        description: 'Read project data in Jira.',
        scope: 'read:project:jira'
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
      try {
        let http = createAxios();

        let tokenResponse = await http.post('https://auth.atlassian.com/oauth/token', {
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        });

        let accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
          throw jiraServiceError('Jira OAuth token response did not include an access token.');
        }

        let refreshToken = tokenResponse.data.refresh_token;
        let expiresIn = tokenResponse.data.expires_in;
        let expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : undefined;

        let sites = await fetchAccessibleJiraSites(accessToken);
        let site = selectOauthJiraSite(sites, ctx.input?.site);

        return {
          output: {
            token: accessToken,
            cloudId: site.cloudId,
            siteUrl: site.url || undefined,
            siteName: site.name || undefined,
            sites,
            refreshToken,
            expiresAt
          }
        };
      } catch (error) {
        throw jiraApiError(error, 'OAuth callback');
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      try {
        let http = createAxios();

        let tokenResponse = await http.post('https://auth.atlassian.com/oauth/token', {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        });

        let accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
          throw jiraServiceError(
            'Jira OAuth refresh response did not include an access token.'
          );
        }

        let refreshToken = tokenResponse.data.refresh_token ?? ctx.output.refreshToken;
        let expiresIn = tokenResponse.data.expires_in;
        let expiresAt = expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : undefined;

        let output: AuthOutput = {
          ...ctx.output,
          token: accessToken,
          refreshToken,
          expiresAt
        };

        // Connections created before the site list was stored get it filled in
        // here. This is best-effort: the refreshed token is valid either way,
        // and the connected site (cloudId) never changes on refresh.
        if (!output.sites) {
          let sites: JiraSite[] | undefined;
          try {
            sites = await fetchAccessibleJiraSites(accessToken);
          } catch {
            sites = undefined;
          }

          if (sites) {
            let active = sites.find(candidate => candidate.cloudId === output.cloudId);
            output = {
              ...output,
              sites,
              siteUrl: output.siteUrl ?? (active?.url || undefined),
              siteName: output.siteName ?? (active?.name || undefined)
            };
          }
        }

        return { output };
      } catch (error) {
        throw jiraApiError(error, 'OAuth refresh');
      }
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { site?: string };
      scopes: string[];
    }) => {
      try {
        let http = createAxios({
          baseURL: 'https://api.atlassian.com',
          headers: { Authorization: `Bearer ${ctx.output.token}` }
        });

        let meResponse = await http.get('/me');
        let me = meResponse.data;

        return {
          profile: {
            id: me.account_id,
            email: me.email,
            name: me.name,
            imageUrl: me.picture
          }
        };
      } catch (error) {
        throw jiraApiError(error, 'profile lookup');
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      email: z.string().describe('The email address associated with your Atlassian account.'),
      token: z
        .string()
        .describe(
          'API token generated from https://id.atlassian.com/manage-profile/security/api-tokens'
        ),
      domain: z
        .string()
        .describe('Your Atlassian domain (e.g., "mycompany" for mycompany.atlassian.net)')
    }),

    getOutput: async ctx => {
      try {
        let basicToken = btoa(`${ctx.input.email}:${ctx.input.token}`);

        let tenantInfo = await createAxios().get(
          `https://${ctx.input.domain}.atlassian.net/_edge/tenant_info`
        );
        let cloudId = (tenantInfo.data as { cloudId?: string }).cloudId;
        if (!cloudId) {
          throw jiraServiceError(
            `Could not resolve cloudId for domain "${ctx.input.domain}". Verify the domain is correct (e.g., "mycompany" for mycompany.atlassian.net).`
          );
        }

        return {
          output: {
            token: basicToken,
            cloudId,
            siteUrl: `https://${ctx.input.domain}.atlassian.net`
          }
        };
      } catch (error) {
        throw jiraApiError(error, 'API token setup');
      }
    },

    getProfile: async (ctx: {
      output: AuthOutput;
      input: { email: string; token: string; domain: string };
    }) => {
      try {
        let http = createAxios({
          baseURL: `https://api.atlassian.com/ex/jira/${ctx.output.cloudId}/rest/api/3`,
          headers: { Authorization: `Basic ${ctx.output.token}` }
        });

        let response = await http.get('/myself');
        let user = response.data;

        return {
          profile: {
            id: user.accountId,
            email: user.emailAddress,
            name: user.displayName,
            imageUrl: user.avatarUrls?.['48x48']
          }
        };
      } catch (error) {
        throw jiraApiError(error, 'profile lookup');
      }
    }
  });
