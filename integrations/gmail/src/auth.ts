import { badRequestError, ServiceError } from '@lowerdeck/error';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { gmailScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let profileAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
});

let gmailServiceError = (message: string) => new ServiceError(badRequestError({ message }));

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
        title: 'Read-Only',
        description: 'Read all resources and their metadata—no modifications.',
        scope: gmailScopes.gmailReadonly
      },
      {
        title: 'Send',
        description: 'Send messages only. No read or modify access.',
        scope: gmailScopes.gmailSend
      },
      {
        title: 'Compose',
        description: 'Create, read, update, and delete drafts. Send messages and drafts.',
        scope: gmailScopes.gmailCompose
      },
      {
        title: 'Modify',
        description: 'All read/write operations except permanent deletion bypassing Trash.',
        scope: gmailScopes.gmailModify
      },
      {
        title: 'Labels',
        description: 'Create, read, update, and delete labels only.',
        scope: gmailScopes.gmailLabels
      },
      {
        title: 'Insert',
        description: 'Insert and import messages only.',
        scope: gmailScopes.gmailInsert
      },
      {
        title: 'Basic Settings',
        description: 'Manage basic mail settings.',
        scope: gmailScopes.gmailSettingsBasic
      },
      {
        title: 'Sharing Settings',
        description:
          'Manage sensitive mail settings including forwarding rules and aliases. Restricted to service accounts with domain-wide delegation.',
        scope: gmailScopes.gmailSettingsSharing
      },
      {
        title: 'Google Contacts (Read-only)',
        description: 'See and download your Google Contacts for address lookup.',
        defaultChecked: true,
        scope: gmailScopes.contactsReadonly
      },
      {
        title: 'Google Other Contacts (Read-only)',
        description: 'See and download contact info automatically saved in "Other contacts".',
        defaultChecked: false,
        scope: gmailScopes.contactsOtherReadonly
      },
      {
        title: 'Full Access',
        description:
          'Full access to the Gmail account including permanent deletion of threads and messages.',
        scope: gmailScopes.fullMail
      },
      {
        title: 'User Profile',
        description: 'View your basic profile info including your email address.',
        scope: gmailScopes.userInfoEmail
      },
      {
        title: 'User Profile Info',
        description: 'View your name and profile picture.',
        scope: gmailScopes.userInfoProfile
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: ctx.scopes.join(' '),
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
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
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
        throw gmailServiceError('No refresh token available');
      }

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
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
      let response = await profileAxios.get('/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  });
