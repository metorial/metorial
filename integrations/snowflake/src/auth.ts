import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Access token for authenticating with Snowflake APIs'),
      refreshToken: z
        .string()
        .optional()
        .describe('OAuth refresh token for obtaining new access tokens'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the access token expires'),
      tokenType: z
        .enum(['OAUTH', 'KEYPAIR_JWT', 'PROGRAMMATIC_ACCESS_TOKEN'])
        .optional()
        .describe('Type of authorization token being used')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Snowflake OAuth',
    key: 'snowflake_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.snowflake.com/en/user-guide/oauth-custom'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.snowflake.com/en/user-guide/oauth-custom#using-a-scope'
      }
    ],

    scopes: [
      {
        title: 'Refresh Token',
        description: 'Request a refresh token for long-lived access',
        scope: 'refresh_token'
      },
      {
        title: 'Public Role',
        description: 'Use the PUBLIC role for the session',
        scope: 'session:role:PUBLIC'
      },
      {
        title: 'Sysadmin Role',
        description: 'Use the SYSADMIN role for the session',
        scope: 'session:role:SYSADMIN'
      },
      {
        title: 'Useradmin Role',
        description: 'Use the USERADMIN role for the session',
        scope: 'session:role:USERADMIN'
      }
    ],

    inputSchema: z.object({
      accountIdentifier: z
        .string()
        .describe('Snowflake account identifier (e.g. myorg-myaccount)')
    }),

    getAuthorizationUrl: async ctx => {
      let baseUrl = `https://${ctx.input.accountIdentifier}.snowflakecomputing.com`;
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `${baseUrl}/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let baseUrl = `https://${ctx.input.accountIdentifier}.snowflakecomputing.com`;
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let http = createAxios({ baseURL: baseUrl });

      let response = await http.post(
        '/oauth/token-request',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          tokenType: 'OAUTH' as const
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error(
          'No refresh token available. Re-authenticate with the refresh_token scope.'
        );
      }

      let baseUrl = `https://${ctx.input.accountIdentifier}.snowflakecomputing.com`;
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let http = createAxios({ baseURL: baseUrl });

      let response = await http.post(
        '/oauth/token-request',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          redirect_uri: ''
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          tokenType: 'OAUTH' as const
        },
        input: ctx.input
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Key Pair JWT',
    key: 'keypair_jwt',

    inputSchema: z.object({
      token: z
        .string()
        .describe('JWT token generated using your RSA private key for key-pair authentication')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          tokenType: 'KEYPAIR_JWT' as const
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Programmatic Access Token',
    key: 'pat',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Programmatic access token (PAT) generated via Snowsight or SQL')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          tokenType: 'PROGRAMMATIC_ACCESS_TOKEN' as const
        }
      };
    }
  });
