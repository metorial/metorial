import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { mailchimpApiError, mailchimpServiceError } from './lib/errors';

let oauthAxios = createAxios({
  baseURL: 'https://login.mailchimp.com'
});

type AuthOutput = {
  token: string;
  serverPrefix: string;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      serverPrefix: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/'
      }
    ],

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://login.mailchimp.com/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let accessToken: string;
      let serverPrefix: string;

      try {
        let tokenResponse = await oauthAxios.post(
          '/oauth2/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri,
            code: ctx.code
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        accessToken = tokenResponse.data.access_token as string;
      } catch (error) {
        throw mailchimpApiError(error, 'OAuth token exchange');
      }

      try {
        let metadataResponse = await oauthAxios.get('/oauth2/metadata', {
          headers: {
            Authorization: `OAuth ${accessToken}`
          }
        });

        serverPrefix = metadataResponse.data.dc as string;
      } catch (error) {
        throw mailchimpApiError(error, 'OAuth metadata lookup');
      }

      if (!accessToken || !serverPrefix) {
        throw mailchimpServiceError(
          'Mailchimp OAuth did not return a usable token and data center.'
        );
      }

      return {
        output: {
          token: accessToken,
          serverPrefix
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: {}; scopes: string[] }) => {
      let apiAxios = createAxios({
        baseURL: `https://${ctx.output.serverPrefix}.api.mailchimp.com/3.0`
      });

      let response: any;

      try {
        response = await apiAxios.get('/', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        });
      } catch (error) {
        throw mailchimpApiError(error, 'profile lookup');
      }

      let data = response.data;

      return {
        profile: {
          id: data.account_id,
          email: data.email,
          name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || data.account_name,
          accountName: data.account_name
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Mailchimp API key (e.g., "abc123def-us19"). Find it under Profile > Extras > API Keys.'
        )
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      let parts = token.split('-');
      let serverPrefix = parts[parts.length - 1] ?? '';

      if (parts.length < 2 || !/^[a-z]{2}\d+$/i.test(serverPrefix)) {
        throw mailchimpServiceError(
          'Mailchimp API key must include a data center suffix, for example "abc123-us19".'
        );
      }

      return {
        output: {
          token,
          serverPrefix
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: { token: string } }) => {
      let apiAxios = createAxios({
        baseURL: `https://${ctx.output.serverPrefix}.api.mailchimp.com/3.0`
      });

      let encoded = btoa(`anystring:${ctx.output.token}`);

      let response: any;

      try {
        response = await apiAxios.get('/', {
          headers: {
            Authorization: `Basic ${encoded}`
          }
        });
      } catch (error) {
        throw mailchimpApiError(error, 'profile lookup');
      }

      let data = response.data;

      return {
        profile: {
          id: data.account_id,
          email: data.email,
          name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || data.account_name,
          accountName: data.account_name
        }
      };
    }
  });
