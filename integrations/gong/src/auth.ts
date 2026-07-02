import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { gongApiError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      baseUrl: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://help.gong.io/docs/create-an-app-for-gong'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://help.gong.io/docs/create-an-app-for-gong'
      }
    ],

    scopes: [
      {
        title: 'Calls Read (Basic)',
        description: 'Read basic call data',
        scope: 'api:calls:read:basic'
      },
      {
        title: 'Calls Read (Media)',
        description: 'Read call media/recordings',
        scope: 'api:calls:read:media-url'
      },
      {
        title: 'Calls Read (Extensive)',
        description: 'Read extensive call data including topics, trackers, etc.',
        scope: 'api:calls:read:extensive'
      },
      {
        title: 'Calls Read (Transcript)',
        description: 'Read call transcripts',
        scope: 'api:calls:read:transcript'
      },
      {
        title: 'Calls Create',
        description: 'Upload and create call recordings',
        scope: 'api:calls:create'
      },
      {
        title: 'Library Read',
        description: 'Read library folders and calls',
        scope: 'api:library:read'
      },
      { title: 'Users Read', description: 'Read user information', scope: 'api:users:read' },
      {
        title: 'Flows Read',
        description: 'Read Engage flows and folders',
        scope: 'api:flows:read'
      },
      {
        title: 'Flows Write',
        description: 'Manage Engage flow assignments',
        scope: 'api:flows:write'
      },
      {
        title: 'User Actions Stats',
        description: 'Read user activity statistics',
        scope: 'api:stats:user-actions'
      },
      {
        title: 'User Actions Detailed',
        description: 'Read detailed daily user activity',
        scope: 'api:stats:user-actions:detailed'
      },
      {
        title: 'Interaction Stats',
        description: 'Read interaction statistics',
        scope: 'api:stats:interaction'
      },
      {
        title: 'Scorecards Stats',
        description: 'Read scorecard answers',
        scope: 'api:stats:scorecards'
      },
      {
        title: 'CRM Get Objects',
        description: 'Retrieve CRM objects',
        scope: 'api:crm:get-objects'
      },
      {
        title: 'CRM Schema',
        description: 'Manage CRM entity schemas',
        scope: 'api:crm:schema'
      },
      {
        title: 'CRM Integrations Read',
        description: 'Read CRM integrations',
        scope: 'api:crm:integrations:read'
      },
      { title: 'CRM Upload', description: 'Upload CRM data', scope: 'api:crm:upload' },
      {
        title: 'Call User Access Read',
        description: 'Read call user access',
        scope: 'api:call-user-access:read'
      },
      {
        title: 'Call User Access Write',
        description: 'Grant and revoke individual call user access',
        scope: 'api:call-user-access:write'
      },
      {
        title: 'Meetings Create',
        description: 'Create meetings',
        scope: 'api:meetings:user:create'
      },
      {
        title: 'Meetings Update',
        description: 'Update meetings',
        scope: 'api:meetings:user:update'
      },
      {
        title: 'Meetings Delete',
        description: 'Delete meetings',
        scope: 'api:meetings:user:delete'
      },
      {
        title: 'Meetings Integration Status',
        description: 'Post meeting integration status',
        scope: 'api:meetings:integration:status'
      },
      {
        title: 'Digital Interactions Write',
        description: 'Push digital interaction data',
        scope: 'api:digital-interactions:write'
      },
      {
        title: 'Data Privacy Read',
        description: 'Read data privacy information',
        scope: 'api:data-privacy:read'
      },
      {
        title: 'Data Privacy Delete',
        description: 'Delete data for privacy compliance',
        scope: 'api:data-privacy:delete'
      },
      { title: 'Audit Logs Read', description: 'Read audit log data', scope: 'api:logs:read' },
      {
        title: 'Settings Trackers Read',
        description: 'Read tracker settings definitions',
        scope: 'api:settings:trackers:read'
      },
      {
        title: 'Settings Scorecards Read',
        description: 'Read scorecard settings definitions',
        scope: 'api:settings:scorecards:read'
      },
      {
        title: 'Workspaces Read',
        description: 'Read workspace information',
        scope: 'api:workspaces:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://app.gong.io/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;

      try {
        let tokenAxios = createAxios({
          baseURL: 'https://app.gong.io'
        });

        response = await tokenAxios.post(
          '/oauth2/generate-customer-token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: ctx.code,
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw gongApiError(error, 'OAuth token exchange');
      }

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      let baseUrl = data.api_base_url_for_customer || 'https://api.gong.io';

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          baseUrl
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;

      try {
        let tokenAxios = createAxios({
          baseURL: 'https://app.gong.io'
        });

        response = await tokenAxios.post(
          '/oauth2/generate-customer-token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken || ''
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw gongApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      let baseUrl = data.api_base_url_for_customer || ctx.output.baseUrl;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          baseUrl
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key (Basic Auth)',
    key: 'basic_auth',

    inputSchema: z.object({
      accessKey: z.string().describe('Gong API Access Key'),
      accessKeySecret: z.string().describe('Gong API Access Key Secret')
    }),

    getOutput: async ctx => {
      let basicToken = btoa(`${ctx.input.accessKey}:${ctx.input.accessKeySecret}`);

      return {
        output: {
          token: basicToken,
          baseUrl: 'https://api.gong.io'
        }
      };
    }
  });
