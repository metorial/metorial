import { createApiServiceError, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { createAtlassianAxios } from './lib/client';

let atlassianAxios = createAtlassianAxios('https://auth.atlassian.com');
let apiAxios = createAtlassianAxios('https://api.atlassian.com');

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  cloudId: z.string().describe('Jira Cloud site ID'),
  siteUrl: z.string().optional().describe('URL of the connected Jira site'),
  authType: z.enum(['basic', 'bearer']).optional()
});
type AuthOutput = z.infer<typeof outputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    inputSchema: z.object({
      siteUrl: z
        .string()
        .optional()
        .describe(
          'Jira site URL, for example https://mycompany.atlassian.net. Required when the authorization grants access to several Jira sites.'
        )
    }),
    scopes: [
      {
        title: 'Read Requests',
        description: 'Read customer requests, approvals, comments, and request types',
        scope: 'read:servicedesk-request'
      },
      {
        title: 'Write Requests',
        description: 'Create and manage customer requests',
        scope: 'write:servicedesk-request'
      },
      {
        title: 'Manage Customers',
        description: 'Manage customers and organizations',
        scope: 'manage:servicedesk-customer'
      },
      {
        title: 'Read Jira Work',
        description: 'Read issues, projects, queues, and SLA information',
        scope: 'read:jira-work'
      },
      {
        title: 'Write Jira Work',
        description: 'Create and edit issues',
        scope: 'write:jira-work'
      },
      {
        title: 'Read Jira Users',
        description: 'Search Jira users and read the current Jira user',
        scope: 'read:jira-user'
      },
      {
        title: 'Read Knowledge Base',
        description: 'Search articles linked to service desks',
        scope: 'read:knowledgebase:jira-service-management'
      },
      {
        title: 'Read User',
        description: 'Read your Atlassian profile information',
        scope: 'read:me'
      },
      {
        title: 'Offline Access',
        description: 'Access refresh tokens for long-lived sessions',
        scope: 'offline_access'
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
      return { url: `https://auth.atlassian.com/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let response = await atlassianAxios.post('/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      let tokens = normalizeOAuthTokenResponse(response.data, { providerLabel: 'Atlassian' });
      let responseSites = await apiAxios.get('/oauth/token/accessible-resources', {
        headers: { Authorization: `Bearer ${tokens.token}` }
      });
      let sites = z
        .array(
          z.object({
            id: z.string(),
            url: z.string(),
            scopes: z.array(z.string())
          })
        )
        .safeParse(responseSites.data);
      if (!sites.success) {
        throw createApiServiceError('Atlassian returned an invalid list of accessible sites.');
      }
      let jiraSites = sites.data.filter(site =>
        site.scopes.some(scope => scope.includes('jira') || scope.includes('servicedesk'))
      );
      let requestedSite = ctx.input.siteUrl?.trim().replace(/\/$/, '').toLowerCase();
      let site = requestedSite
        ? jiraSites.find(site => site.url.replace(/\/$/, '').toLowerCase() === requestedSite)
        : jiraSites.length === 1
          ? jiraSites[0]
          : undefined;
      if (!site) {
        throw createApiServiceError(
          jiraSites.length === 0
            ? 'No authorized Jira sites were returned. Grant access to a Jira site and reconnect.'
            : 'Reconnect and provide the Jira site URL to select an authorized site.'
        );
      }
      return {
        output: { ...tokens, cloudId: site.id, siteUrl: site.url, authType: 'bearer' }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Reconnect your Atlassian account with offline access to renew this session.'
        );
      }
      let response = await atlassianAxios.post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });
      let tokens = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Atlassian',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy'
      });
      return { output: { ...ctx.output, ...tokens } };
    },
    getProfile: async (ctx: { output: AuthOutput }) => {
      let response = await apiAxios.get('/me', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      let data = response.data;
      return {
        profile: {
          id: data.account_id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      email: z.string().describe('Your Atlassian account email address'),
      token: z
        .string()
        .describe('Unscoped API token generated from Atlassian account settings'),
      domain: z
        .string()
        .describe('Your Atlassian domain (e.g., "mycompany" for mycompany.atlassian.net)')
    }),
    getOutput: async ctx => {
      let domain = ctx.input.domain.trim();
      if (!/^[a-z0-9][a-z0-9-]*$/i.test(domain)) {
        throw createApiServiceError(
          'Enter only your Atlassian subdomain, for example mycompany.'
        );
      }
      let siteUrl = `https://${domain}.atlassian.net`;
      let tenantInfo = await createAtlassianAxios(siteUrl).get('/_edge/tenant_info');
      let cloudId = tenantInfo.data?.cloudId;
      if (typeof cloudId !== 'string' || !cloudId) {
        throw createApiServiceError(
          'Could not resolve the Jira Cloud site ID. Verify your Atlassian domain.'
        );
      }
      return {
        output: {
          token: Buffer.from(`${ctx.input.email}:${ctx.input.token}`).toString('base64'),
          cloudId,
          siteUrl,
          authType: 'basic'
        }
      };
    },
    getProfile: async (ctx: { output: AuthOutput; input: { domain: string } }) => {
      let response = await createAtlassianAxios(
        ctx.output.siteUrl ?? `https://${ctx.input.domain}.atlassian.net`,
        `Basic ${ctx.output.token}`
      ).get('/rest/api/3/myself');
      let data = response.data;
      return {
        profile: {
          id: data.accountId,
          email: data.emailAddress,
          name: data.displayName,
          imageUrl: data.avatarUrls?.['48x48']
        }
      };
    }
  });
