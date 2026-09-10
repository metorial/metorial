import { createHash, randomBytes } from 'node:crypto';
import { createAxios, SlateAuth, type SlateAuthWithOauth } from 'slates';
import { z } from 'zod';
import { datadogApiError, datadogServiceError } from './lib/errors';

const siteSchema = z.enum([
  'datadoghq.com',
  'us3.datadoghq.com',
  'us5.datadoghq.com',
  'datadoghq.eu',
  'ap1.datadoghq.com',
  'ap2.datadoghq.com',
  'ddog-gov.com'
]);

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().finite().default(3600)
});

const parseTokenResponse = (response: unknown) => {
  const result = tokenResponseSchema.safeParse(response);
  if (!result.success) {
    throw datadogServiceError('Datadog returned an invalid OAuth token response.');
  }
  return result.data;
};

const authOutputSchema = z.object({
  token: z.string(),
  apiKey: z.string().optional(),
  appKey: z.string().optional(),
  site: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authMethod: z.enum(['oauth', 'apikey']).describe('Which authentication method is in use')
});

type OAuthRefreshContext = Parameters<
  NonNullable<
    SlateAuthWithOauth<
      { site?: string },
      z.infer<typeof authOutputSchema>
    >['handleTokenRefresh']
  >
>[0];

export let auth = SlateAuth.create()
  .output(authOutputSchema)
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
      { title: 'Hosts Read', description: 'View host information', scope: 'hosts_read' }
    ],

    inputSchema: z.object({
      site: siteSchema
        .default('datadoghq.com')
        .describe('Datadog site/region for your account')
    }),

    getAuthorizationUrl: async ctx => {
      let site = ctx.input.site || 'datadoghq.com';
      let codeVerifier = randomBytes(32).toString('base64url');
      let scopeStr = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: scopeStr,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://app.${site}/oauth2/v1/authorize?${params.toString()}`,
        input: { site },
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      const domain = siteSchema.safeParse(ctx.callbackParams?.domain ?? ctx.input.site);
      if (!domain.success) {
        throw datadogServiceError('Datadog returned an unsupported OAuth site.');
      }
      let site = domain.data;
      const verifier = z.string().min(43).max(128).safeParse(ctx.callbackState?.codeVerifier);
      if (!verifier.success) {
        throw datadogServiceError(
          'Datadog OAuth callback is missing its PKCE verifier. Re-authorize the connection.'
        );
      }
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
            redirect_uri: ctx.redirectUri,
            code_verifier: verifier.data
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } catch (error) {
        throw datadogApiError(error, 'OAuth token exchange');
      }

      let data = parseTokenResponse(response.data);
      if (!data.refresh_token) {
        throw datadogServiceError(
          'Datadog did not return an OAuth refresh token. Re-authorize the connection.'
        );
      }
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          site,
          authMethod: 'oauth' as const
        },
        input: { site }
      };
    },

    handleTokenRefresh: async (ctx: OAuthRefreshContext) => {
      const domain = siteSchema.safeParse(
        ctx.output.site ?? ctx.input.site ?? 'datadoghq.com'
      );
      if (!domain.success) {
        throw datadogServiceError('Datadog OAuth connection has an unsupported site.');
      }
      let site = domain.data;
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

      let data = parseTokenResponse(response.data);
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          ...ctx.output,
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          site,
          authMethod: 'oauth' as const
        },
        input: { ...ctx.input, site }
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
      site: siteSchema
        .default('datadoghq.com')
        .describe('Datadog site/region for validating the keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiKey: ctx.input.apiKey,
          appKey: ctx.input.appKey,
          site: ctx.input.site,
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
