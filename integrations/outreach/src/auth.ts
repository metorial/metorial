import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.outreach.io'
});

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
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.outreach.io/api/oauth/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.outreach.io/api/getting-started/#authorization'
      }
    ],

    scopes: [
      {
        title: 'Accounts (All)',
        description: 'Full access to accounts',
        scope: 'accounts.all'
      },
      {
        title: 'Accounts (Read)',
        description: 'Read access to accounts',
        scope: 'accounts.read'
      },
      {
        title: 'Accounts (Write)',
        description: 'Write access to accounts',
        scope: 'accounts.write'
      },
      {
        title: 'Accounts (Delete)',
        description: 'Delete access to accounts',
        scope: 'accounts.delete'
      },
      {
        title: 'Audit Logs (Read)',
        description: 'Read access to audit logs',
        scope: 'auditLogs.read'
      },
      { title: 'Calls (All)', description: 'Full access to calls', scope: 'calls.all' },
      { title: 'Calls (Read)', description: 'Read access to calls', scope: 'calls.read' },
      { title: 'Calls (Write)', description: 'Write access to calls', scope: 'calls.write' },
      {
        title: 'Call Dispositions (Read)',
        description: 'Read access to call dispositions',
        scope: 'callDispositions.read'
      },
      {
        title: 'Call Purposes (Read)',
        description: 'Read access to call purposes',
        scope: 'callPurposes.read'
      },
      {
        title: 'Compliance Requests (All)',
        description: 'Full access to compliance requests',
        scope: 'complianceRequests.all'
      },
      {
        title: 'Content Categories (Read)',
        description: 'Read access to content categories',
        scope: 'contentCategories.read'
      },
      { title: 'Events (All)', description: 'Full access to events', scope: 'events.all' },
      { title: 'Events (Read)', description: 'Read access to events', scope: 'events.read' },
      {
        title: 'Favorites (All)',
        description: 'Full access to favorites',
        scope: 'favorites.all'
      },
      {
        title: 'Mailings (All)',
        description: 'Full access to mailings',
        scope: 'mailings.all'
      },
      {
        title: 'Mailings (Read)',
        description: 'Read access to mailings',
        scope: 'mailings.read'
      },
      {
        title: 'Mailboxes (Read)',
        description: 'Read access to mailboxes',
        scope: 'mailboxes.read'
      },
      {
        title: 'Opportunities (All)',
        description: 'Full access to opportunities',
        scope: 'opportunities.all'
      },
      {
        title: 'Opportunities (Read)',
        description: 'Read access to opportunities',
        scope: 'opportunities.read'
      },
      {
        title: 'Opportunities (Write)',
        description: 'Write access to opportunities',
        scope: 'opportunities.write'
      },
      {
        title: 'Personas (Read)',
        description: 'Read access to personas',
        scope: 'personas.read'
      },
      {
        title: 'Prospects (All)',
        description: 'Full access to prospects',
        scope: 'prospects.all'
      },
      {
        title: 'Prospects (Read)',
        description: 'Read access to prospects',
        scope: 'prospects.read'
      },
      {
        title: 'Prospects (Write)',
        description: 'Write access to prospects',
        scope: 'prospects.write'
      },
      {
        title: 'Prospects (Delete)',
        description: 'Delete access to prospects',
        scope: 'prospects.delete'
      },
      { title: 'Roles (Read)', description: 'Read access to roles', scope: 'roles.read' },
      {
        title: 'Sequences (All)',
        description: 'Full access to sequences',
        scope: 'sequences.all'
      },
      {
        title: 'Sequences (Read)',
        description: 'Read access to sequences',
        scope: 'sequences.read'
      },
      {
        title: 'Sequences (Write)',
        description: 'Write access to sequences',
        scope: 'sequences.write'
      },
      {
        title: 'Sequence States (All)',
        description: 'Full access to sequence states',
        scope: 'sequenceStates.all'
      },
      {
        title: 'Sequence States (Read)',
        description: 'Read access to sequence states',
        scope: 'sequenceStates.read'
      },
      {
        title: 'Sequence Steps (Read)',
        description: 'Read access to sequence steps',
        scope: 'sequenceSteps.read'
      },
      {
        title: 'Snippets (All)',
        description: 'Full access to snippets',
        scope: 'snippets.all'
      },
      {
        title: 'Snippets (Read)',
        description: 'Read access to snippets',
        scope: 'snippets.read'
      },
      { title: 'Stages (Read)', description: 'Read access to stages', scope: 'stages.read' },
      { title: 'Tasks (All)', description: 'Full access to tasks', scope: 'tasks.all' },
      { title: 'Tasks (Read)', description: 'Read access to tasks', scope: 'tasks.read' },
      { title: 'Tasks (Write)', description: 'Write access to tasks', scope: 'tasks.write' },
      { title: 'Teams (Read)', description: 'Read access to teams', scope: 'teams.read' },
      {
        title: 'Templates (All)',
        description: 'Full access to templates',
        scope: 'templates.all'
      },
      {
        title: 'Templates (Read)',
        description: 'Read access to templates',
        scope: 'templates.read'
      },
      { title: 'Users (All)', description: 'Full access to users', scope: 'users.all' },
      { title: 'Users (Read)', description: 'Read access to users', scope: 'users.read' },
      {
        title: 'Webhooks (All)',
        description: 'Full access to webhooks',
        scope: 'webhooks.all'
      },
      {
        title: 'Webhooks (Read)',
        description: 'Read access to webhooks',
        scope: 'webhooks.read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopes = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: scopes,
        state: ctx.state
      });

      return {
        url: `https://api.outreach.io/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await api.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code',
        code: ctx.code
      });

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let response = await api.post('/oauth/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/api/v2/users?filter[current]=true', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/vnd.api+json'
        }
      });

      let user = response.data?.data?.[0];
      let attrs = user?.attributes ?? {};

      return {
        profile: {
          id: user?.id?.toString(),
          email: attrs.email,
          name: [attrs.firstName, attrs.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
