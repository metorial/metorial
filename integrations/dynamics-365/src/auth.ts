import { axios, SlateAuth } from 'slates';
import { z } from 'zod';

let scopes = [
  {
    title: 'User Impersonation',
    description: 'Access Dynamics 365 as the signed-in user',
    scope: 'user_impersonation'
  },
  {
    title: 'Offline Access',
    description: 'Maintain access with refresh tokens',
    scope: 'offline_access'
  }
];

const DISCOVERY_RESOURCE = 'https://globaldisco.crm.dynamics.com';

function buildAuthScopes(ctxScopes: string[]): string {
  let impersonation = ctxScopes.filter(s => s !== 'offline_access');
  let scoped = impersonation.map(s => `${DISCOVERY_RESOURCE}/${s}`);
  if (ctxScopes.includes('offline_access')) scoped.push('offline_access');
  return scoped.join(' ');
}

function buildInstanceScope(instanceUrl: string, ctxScopes: string[]): string {
  let parts = [`${instanceUrl}/.default`];
  if (ctxScopes.includes('offline_access')) parts.push('offline_access');
  return parts.join(' ');
}

function createMicrosoftOauth(name: string, key: string, tenant: string) {
  return {
    type: 'auth.oauth' as const,
    name,
    key,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://learn.microsoft.com/en-us/graph/permissions-reference'
      }
    ],
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        scope: buildAuthScopes(ctx.scopes),
        state: ctx.state
      });

      return {
        url: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: any) => {
      // Step 1: exchange code for discovery-scoped token.
      let discoveryTokenResp = await axios.post(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code',
          scope: buildAuthScopes(ctx.scopes)
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      let discoveryData = discoveryTokenResp.data as {
        access_token: string;
        refresh_token?: string;
      };

      // Step 2: call global discovery to resolve instance URL.
      let discoResp = await axios.get(`${DISCOVERY_RESOURCE}/api/discovery/v2.0/Instances`, {
        headers: { Authorization: `Bearer ${discoveryData.access_token}` }
      });

      let instances =
        (discoResp.data as { value?: Array<{ Url: string; FriendlyName?: string }> }).value ||
        [];
      if (instances.length === 0) {
        throw new Error(
          'No Dynamics 365 instances found for this account. The signed-in user must have access to at least one Dynamics environment.'
        );
      }

      let instanceUrl = instances[0]!.Url.replace(/\/+$/, '');

      // Step 3: exchange the refresh token for an instance-scoped token.
      if (!discoveryData.refresh_token) {
        throw new Error(
          'No refresh token returned from Microsoft. Ensure offline_access scope is included and your Entra app is configured to issue refresh tokens.'
        );
      }

      let instanceTokenResp = await axios.post(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: discoveryData.refresh_token,
          scope: buildInstanceScope(instanceUrl, ctx.scopes)
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      let instanceData = instanceTokenResp.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      let expiresAt = instanceData.expires_in
        ? new Date(Date.now() + instanceData.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: instanceData.access_token,
          refreshToken: instanceData.refresh_token || discoveryData.refresh_token,
          expiresAt,
          instanceUrl,
          tenantId: tenant
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let instanceUrl = ctx.output.instanceUrl.replace(/\/+$/, '');

      let response = await axios.post(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token',
          scope: buildInstanceScope(instanceUrl, ctx.scopes)
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          instanceUrl: ctx.output.instanceUrl,
          tenantId: ctx.output.tenantId
        }
      };
    },

    getProfile: async (ctx: any) => {
      let instanceUrl = ctx.output.instanceUrl.replace(/\/+$/, '');
      let response = await axios.get(`${instanceUrl}/api/data/v9.2/WhoAmI`, {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let whoAmI = response.data as { UserId: string };
      let userId = whoAmI.UserId;

      let userResponse = await axios.get(
        `${instanceUrl}/api/data/v9.2/systemusers(${userId})?$select=fullname,internalemailaddress,systemuserid`,
        { headers: { Authorization: `Bearer ${ctx.output.token}` } }
      );

      let user = userResponse.data as {
        fullname?: string;
        internalemailaddress?: string;
        systemuserid?: string;
      };

      return {
        profile: {
          id: user.systemuserid,
          name: user.fullname,
          email: user.internalemailaddress
        }
      };
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      instanceUrl: z.string(),
      tenantId: z.string()
    })
  )
  .addOauth(createMicrosoftOauth('Work & Personal', 'oauth_common', 'common'))
  .addOauth(createMicrosoftOauth('Work Only', 'oauth_organizations', 'organizations'))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials (Server-to-Server)',
    key: 'client_credentials',

    inputSchema: z.object({
      tenantId: z.string().describe('Microsoft Entra ID tenant ID'),
      clientId: z.string().describe('Application (client) ID from the app registration'),
      clientSecret: z.string().describe('Client secret from the app registration'),
      instanceUrl: z
        .string()
        .describe('Dynamics 365 instance URL (e.g., https://yourorg.crm.dynamics.com)')
    }),

    getOutput: async ctx => {
      let instanceUrl = ctx.input.instanceUrl.replace(/\/+$/, '');

      let response = await axios.post(
        `https://login.microsoftonline.com/${ctx.input.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: ctx.input.clientId,
          client_secret: ctx.input.clientSecret,
          scope: `${instanceUrl}/.default`,
          grant_type: 'client_credentials'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: undefined,
          expiresAt,
          instanceUrl,
          tenantId: ctx.input.tenantId
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        instanceUrl: string;
        tenantId: string;
        refreshToken?: string;
        expiresAt?: string;
      };
      input: { tenantId: string; clientId: string; clientSecret: string; instanceUrl: string };
    }) => {
      let instanceUrl = ctx.output.instanceUrl.replace(/\/+$/, '');
      let response = await axios.get(`${instanceUrl}/api/data/v9.2/WhoAmI`, {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let whoAmI = response.data;

      return {
        profile: {
          id: whoAmI.UserId,
          name: `Application User (${whoAmI.OrganizationId})`
        }
      };
    }
  });
