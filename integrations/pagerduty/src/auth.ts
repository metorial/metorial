import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      tokenType: z.enum(['oauth', 'api_key']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Scoped OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.pagerduty.com/docs/user-oauth-token-via-code-grant'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.pagerduty.com/docs/oauth-2-functionality'
      }
    ],

    scopes: [
      // Incidents
      {
        title: 'Read Incidents',
        description: 'Read access to incidents',
        scope: 'incidents.read'
      },
      {
        title: 'Write Incidents',
        description: 'Write access to incidents',
        scope: 'incidents.write'
      },

      // Services
      {
        title: 'Read Services',
        description: 'Read access to services',
        scope: 'services.read'
      },
      {
        title: 'Write Services',
        description: 'Write access to services',
        scope: 'services.write'
      },

      // Users
      { title: 'Read Users', description: 'Read access to users', scope: 'users.read' },
      { title: 'Write Users', description: 'Write access to users', scope: 'users.write' },

      // Teams
      { title: 'Read Teams', description: 'Read access to teams', scope: 'teams.read' },
      { title: 'Write Teams', description: 'Write access to teams', scope: 'teams.write' },

      // Schedules
      {
        title: 'Read Schedules',
        description: 'Read access to on-call schedules',
        scope: 'schedules.read'
      },
      {
        title: 'Write Schedules',
        description: 'Write access to on-call schedules',
        scope: 'schedules.write'
      },

      // Escalation Policies
      {
        title: 'Read Escalation Policies',
        description: 'Read access to escalation policies',
        scope: 'escalation_policies.read'
      },
      {
        title: 'Write Escalation Policies',
        description: 'Write access to escalation policies',
        scope: 'escalation_policies.write'
      },

      // Oncalls
      {
        title: 'Read On-Calls',
        description: 'Read access to on-call information',
        scope: 'oncalls.read'
      },

      // Tags
      { title: 'Read Tags', description: 'Read access to tags', scope: 'tags.read' },
      { title: 'Write Tags', description: 'Write access to tags', scope: 'tags.write' },

      // Priorities
      {
        title: 'Read Priorities',
        description: 'Read access to incident priorities',
        scope: 'priorities.read'
      },

      // Extensions
      {
        title: 'Read Extensions',
        description: 'Read access to extensions',
        scope: 'extensions.read'
      },
      {
        title: 'Write Extensions',
        description: 'Write access to extensions',
        scope: 'extensions.write'
      },

      // Webhook Subscriptions
      {
        title: 'Read Webhook Subscriptions',
        description: 'Read access to webhook subscriptions',
        scope: 'webhook_subscriptions.read'
      },
      {
        title: 'Write Webhook Subscriptions',
        description: 'Write access to webhook subscriptions',
        scope: 'webhook_subscriptions.write'
      },

      // Analytics
      {
        title: 'Read Analytics',
        description: 'Read access to analytics data',
        scope: 'analytics.read'
      },

      // Audit
      {
        title: 'Read Audit Records',
        description: 'Read access to audit trail records',
        scope: 'audit.read'
      },

      // Event Orchestration
      {
        title: 'Read Event Orchestrations',
        description: 'Read access to event orchestration rules',
        scope: 'event_orchestrations.read'
      },
      {
        title: 'Write Event Orchestrations',
        description: 'Write access to event orchestration rules',
        scope: 'event_orchestrations.write'
      },

      // Custom Fields
      {
        title: 'Read Custom Fields',
        description: 'Read access to custom fields',
        scope: 'custom_fields.read'
      },
      {
        title: 'Write Custom Fields',
        description: 'Write access to custom fields',
        scope: 'custom_fields.write'
      },

      // Maintenance Windows
      {
        title: 'Read Maintenance Windows',
        description: 'Read access to maintenance windows',
        scope: 'maintenance_windows.read'
      },
      {
        title: 'Write Maintenance Windows',
        description: 'Write access to maintenance windows',
        scope: 'maintenance_windows.write'
      },

      // Notifications
      {
        title: 'Read Notifications',
        description: 'Read access to notifications',
        scope: 'notifications.read'
      },

      // Incident Workflows
      {
        title: 'Read Incident Workflows',
        description: 'Read access to incident workflows',
        scope: 'incident_workflows.read'
      },
      {
        title: 'Write Incident Workflows',
        description: 'Write access to incident workflows',
        scope: 'incident_workflows.write'
      }
    ],

    inputSchema: z.object({
      subdomain: z
        .string()
        .describe(
          'Your PagerDuty subdomain (e.g., "yourcompany" from yourcompany.pagerduty.com)'
        )
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes
          .map(
            s => `as_account-${ctx.input.subdomain ? 'us' : 'us'}.${ctx.input.subdomain} ${s}`
          )
          .join(' '),
        state: ctx.state
      });

      return {
        url: `https://app.pagerduty.com/oauth/authorize?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let client = createAxios({ baseURL: 'https://app.pagerduty.com' });

      let response = await client.post(
        '/oauth/token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let data = response.data as {
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
        error?: string;
      };

      if (!data.access_token) {
        throw new Error(`PagerDuty OAuth error: ${data.error || 'No access token returned'}`);
      }

      return {
        output: {
          token: data.access_token,
          tokenType: 'oauth' as const
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let client = createAxios({ baseURL: 'https://app.pagerduty.com' });

      let response = await client.post(
        '/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.token,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let data = response.data as {
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
        error?: string;
      };

      if (!data.access_token) {
        throw new Error(
          `PagerDuty token refresh error: ${data.error || 'No access token returned'}`
        );
      }

      return {
        output: {
          token: data.access_token,
          tokenType: 'oauth' as const
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string; tokenType?: string };
      input: { subdomain: string };
      scopes: string[];
    }) => {
      let client = createAxios({ baseURL: 'https://api.pagerduty.com' });

      let response = await client.get('/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      let data = response.data as {
        user?: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
        };
      };

      return {
        profile: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.name,
          imageUrl: data.user?.avatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('PagerDuty REST API key (20-character string)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          tokenType: 'api_key' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; tokenType?: string };
      input: { token: string };
    }) => {
      let client = createAxios({ baseURL: 'https://api.pagerduty.com' });

      // API key auth uses Token token=... format - try to get current user
      // Note: General access API keys don't have a "current user" concept
      // We'll try the abilities endpoint as a validation check
      try {
        let response = await client.get('/abilities', {
          headers: {
            Authorization: `Token token=${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        });

        let data = response.data as { abilities?: string[] };

        return {
          profile: {
            name: 'API Key User',
            abilities: data.abilities
          }
        };
      } catch {
        return {
          profile: {
            name: 'API Key User'
          }
        };
      }
    }
  });
