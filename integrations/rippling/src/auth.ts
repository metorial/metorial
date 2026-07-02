import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'Employee Work Email',
        description: 'Access to employee work email addresses',
        scope: 'employee:workEmail'
      },
      {
        title: 'Employee Name',
        description: 'Access to employee names',
        scope: 'employee:name'
      },
      {
        title: 'Employee Employment Type',
        description: 'Access to employee employment type (full-time, part-time, etc.)',
        scope: 'employee:employmentType'
      },
      {
        title: 'Employee Title',
        description: 'Access to employee job titles',
        scope: 'employee:title'
      },
      {
        title: 'Employee Department',
        description: 'Access to employee department information',
        scope: 'employee:department'
      },
      {
        title: 'Employee Start Date',
        description: 'Access to employee start dates',
        scope: 'employee:startDate'
      },
      {
        title: 'Employee End Date',
        description: 'Access to employee end/termination dates',
        scope: 'employee:endDate'
      },
      {
        title: 'Employee Phone',
        description: 'Access to employee phone numbers',
        scope: 'employee:phone'
      },
      {
        title: 'Employee Role State',
        description: 'Access to employee role state (active, terminated)',
        scope: 'employee:roleState'
      },
      {
        title: 'Employee Personal Email',
        description: 'Access to employee personal email addresses',
        scope: 'employee:personalEmail'
      },
      {
        title: 'OpenID Connect',
        description: 'Required for OIDC/SSO functionality',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information',
        scope: 'profile'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });

      return {
        url: `https://app.rippling.com/apps/PLATFORM/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let httpClient = createAxios({
        baseURL: 'https://api.rippling.com'
      });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/api/o/token/',
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

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let httpClient = createAxios({
        baseURL: 'https://api.rippling.com'
      });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await httpClient.post(
        '/api/o/token/',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let expiresAt = response.data.expires_in
        ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let httpClient = createAxios({
        baseURL: 'https://api.rippling.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await httpClient.get('/platform/api/company');

      let company = response.data;
      return {
        profile: {
          id: company.id,
          name: company.name,
          email: company.primaryEmail
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z.string().describe('Rippling API token generated from the API Tokens app')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let httpClient = createAxios({
        baseURL: 'https://api.rippling.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await httpClient.get('/platform/api/company');
      let company = response.data;

      return {
        profile: {
          id: company.id,
          name: company.name,
          email: company.primaryEmail
        }
      };
    }
  });
