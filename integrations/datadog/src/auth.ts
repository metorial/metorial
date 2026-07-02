import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { datadogApiError, datadogServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string().optional(),
      appKey: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z.enum(['oauth', 'apikey']).describe('Which authentication method is in use')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.datadoghq.com/extend/authorization/oauth2_endpoints/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.datadoghq.com/api/latest/scopes/'
      }
    ],

    scopes: [
      {
        title: 'Dashboards Read',
        description: 'View dashboards and dashboard lists',
        scope: 'dashboards_read'
      },
      {
        title: 'Dashboards Write',
        description: 'Create, update, and delete dashboards',
        scope: 'dashboards_write'
      },
      {
        title: 'Monitors Read',
        description: 'View monitors and monitor search',
        scope: 'monitors_read'
      },
      {
        title: 'Monitors Write',
        description: 'Create, edit, delete, mute, and unmute monitors',
        scope: 'monitors_write'
      },
      {
        title: 'Monitors Downtime',
        description: 'Manage downtimes for monitors',
        scope: 'monitors_downtime'
      },
      { title: 'Metrics Read', description: 'View and list metrics', scope: 'metrics_read' },
      {
        title: 'Timeseries Query',
        description: 'Query timeseries and scalar data',
        scope: 'timeseries_query'
      },
      {
        title: 'Events Read',
        description: 'Read events from the event stream',
        scope: 'events_read'
      },
      { title: 'Logs Read Data', description: 'Read log data', scope: 'logs_read_data' },
      { title: 'Incident Read', description: 'View incidents', scope: 'incident_read' },
      {
        title: 'Incident Write',
        description: 'Create, update, and delete incidents',
        scope: 'incident_write'
      },
      {
        title: 'User Access Read',
        description: 'View user access information',
        scope: 'user_access_read'
      },
      {
        title: 'User Access Invite',
        description: 'Create users and send invitations',
        scope: 'user_access_invite'
      },
      { title: 'API Keys Read', description: 'View API keys', scope: 'api_keys_read' },
      {
        title: 'API Keys Write',
        description: 'Create and manage API keys',
        scope: 'api_keys_write'
      },
      {
        title: 'Synthetics Read',
        description: 'View Synthetics tests and results',
        scope: 'synthetics_read'
      },
      {
        title: 'Synthetics Write',
        description: 'Create, edit, and delete Synthetics tests',
        scope: 'synthetics_write'
      },
      { title: 'SLOs Read', description: 'View service level objectives', scope: 'slos_read' },
      {
        title: 'SLOs Write',
        description: 'Create, update, and delete SLOs',
        scope: 'slos_write'
      },
      { title: 'Hosts Read', description: 'View host information', scope: 'hosts_read' },
      {
        title: 'APM Read',
        description: 'Read and query APM and Trace Analytics',
        scope: 'apm_read'
      },
      {
        title: 'Security Monitoring Signals Read',
        description: 'Read security monitoring signals',
        scope: 'security_monitoring_signals_read'
      },
      {
        title: 'Security Monitoring Rules Read',
        description: 'Read security monitoring rules',
        scope: 'security_monitoring_rules_read'
      },
      { title: 'Cases Read', description: 'View cases', scope: 'cases_read' },
      { title: 'Cases Write', description: 'Create and manage cases', scope: 'cases_write' },
      { title: 'Usage Read', description: 'View usage data', scope: 'usage_read' },
      {
        title: 'Create Webhooks',
        description: 'Create webhook integrations',
        scope: 'create_webhooks'
      },
      {
        title: 'Manage Integrations',
        description: 'Manage integration configurations',
        scope: 'manage_integrations'
      }
    ],

    inputSchema: z.object({
      site: z
        .enum([
          'datadoghq.com',
          'us3.datadoghq.com',
          'us5.datadoghq.com',
          'datadoghq.eu',
          'ap1.datadoghq.com',
          'ap2.datadoghq.com',
          'ddog-gov.com'
        ])
        .default('datadoghq.com')
        .describe('Datadog site/region for your account')
    }),

    getAuthorizationUrl: async ctx => {
      let site = ctx.input.site || 'datadoghq.com';
      let scopeStr = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: scopeStr
      });
      return {
        url: `https://app.${site}/oauth2/v1/authorize?${params.toString()}`,
        input: { site }
      };
    },

    handleCallback: async ctx => {
      let site = ctx.input.site || 'datadoghq.com';
      let http = createAxios({ baseURL: `https://api.${site}` });

      let response: any;
      try {
        response = await http.post(
          '/oauth2/v1/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } catch (error) {
        throw datadogApiError(error, 'OAuth token exchange');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          authMethod: 'oauth' as const
        },
        input: { site }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let site = ctx.input.site || 'datadoghq.com';
      let http = createAxios({ baseURL: `https://api.${site}` });

      if (!ctx.output.refreshToken) {
        throw datadogServiceError(
          'Datadog OAuth token refresh requires a saved refresh token. Re-authorize the Datadog connection.'
        );
      }

      let response: any;
      try {
        response = await http.post(
          '/oauth2/v1/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } catch (error) {
        throw datadogApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          authMethod: 'oauth' as const
        },
        input: ctx.input
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key + Application Key',
    key: 'apikey_appkey',

    inputSchema: z.object({
      apiKey: z.string().describe('Datadog API key (DD-API-KEY)'),
      appKey: z.string().describe('Datadog Application key (DD-APPLICATION-KEY)'),
      site: z
        .enum([
          'datadoghq.com',
          'us3.datadoghq.com',
          'us5.datadoghq.com',
          'datadoghq.eu',
          'ap1.datadoghq.com',
          'ap2.datadoghq.com',
          'ddog-gov.com'
        ])
        .default('datadoghq.com')
        .describe('Datadog site/region for validating the keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiKey: ctx.input.apiKey,
          appKey: ctx.input.appKey,
          authMethod: 'apikey' as const
        }
      };
    },

    getProfile: async (ctx: {
      output: {
        token: string;
        apiKey?: string;
        appKey?: string;
        authMethod: 'oauth' | 'apikey';
      };
      input: { apiKey: string; appKey: string; site?: string };
    }) => {
      let site = ctx.input.site || 'datadoghq.com';
      let http = createAxios({ baseURL: `https://api.${site}` });

      let response: any;
      try {
        response = await http.get('/api/v1/validate', {
          headers: {
            'DD-API-KEY': ctx.output.apiKey || '',
            'DD-APPLICATION-KEY': ctx.output.appKey || ''
          }
        });
      } catch (error) {
        throw datadogApiError(error, 'key validation');
      }

      return {
        profile: {
          name: 'Datadog API User',
          valid: response.data.valid
        }
      };
    }
  });
