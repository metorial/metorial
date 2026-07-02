import { badRequestError, ServiceError } from '@lowerdeck/error';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleContactsScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let peopleAxios = createAxios({
  baseURL: 'https://people.googleapis.com/v1/'
});

let googleContactsServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Google OAuth',
    key: 'google_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],

    scopes: [
      {
        title: 'Contacts',
        description: 'See, edit, download, and permanently delete your contacts.',
        scope: googleContactsScopes.contacts
      },
      {
        title: 'Contacts (Read-only)',
        description: 'See and download your contacts.',
        scope: googleContactsScopes.contactsReadonly
      },
      {
        title: 'Other Contacts (Read-only)',
        description: 'See and download contact info automatically saved in "Other contacts".',
        scope: googleContactsScopes.contactsOtherReadonly
      },
      {
        title: 'Directory (Read-only)',
        description: "See and download your organization's Google Workspace directory.",
        scope: googleContactsScopes.directoryReadonly
      },
      {
        title: 'User Profile',
        description:
          "See your personal info, including any personal info you've made publicly available.",
        scope: googleContactsScopes.userInfoProfile
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw googleContactsServiceError('No refresh token available');
      }

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
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
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await peopleAxios.get('people/me', {
        params: {
          personFields: 'names,emailAddresses,photos'
        },
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let person = response.data;
      let name = person.names?.[0]?.displayName;
      let email = person.emailAddresses?.[0]?.value;
      let imageUrl = person.photos?.[0]?.url;
      let resourceName = person.resourceName;

      return {
        profile: {
          id: resourceName,
          email,
          name,
          imageUrl
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Google API Key for accessing public profile data')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
