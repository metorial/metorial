import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { splunkApiError, splunkServiceError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Splunk session key or authentication token'),
      hecToken: z.string().optional().describe('HTTP Event Collector token for data ingestion')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Splunk Auth Token',
    key: 'splunk_token',
    inputSchema: z.object({
      token: z.string().describe('Splunk authentication token (JWT) or session key'),
      hecToken: z
        .string()
        .optional()
        .describe('HTTP Event Collector token for data ingestion (optional)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          hecToken: ctx.input.hecToken
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; hecToken?: string };
      input: { token: string; hecToken?: string };
    }) => {
      let axiosInstance = createAxios({});
      try {
        let response = await axiosInstance.get('/services/authentication/current-context', {
          headers: {
            Authorization: `Splunk ${ctx.output.token}`,
            'Content-Type': 'application/json'
          },
          params: { output_mode: 'json' }
        });
        let entry = response.data?.entry?.[0]?.content;
        return {
          profile: {
            name: entry?.realname || entry?.username,
            id: entry?.username,
            roles: entry?.roles
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'basic_auth',
    inputSchema: z.object({
      host: z.string().describe('Splunk instance hostname or IP address'),
      managementPort: z.string().default('8089').describe('Management REST API port'),
      scheme: z.enum(['https', 'http']).default('https').describe('Connection scheme'),
      username: z.string().describe('Splunk username'),
      password: z.string().describe('Splunk password'),
      hecToken: z
        .string()
        .optional()
        .describe('HTTP Event Collector token for data ingestion (optional)')
    }),
    getOutput: async (ctx: {
      input: {
        scheme: string;
        host: string;
        managementPort: string;
        username: string;
        password: string;
        hecToken?: string;
      };
    }) => {
      let baseURL = `${ctx.input.scheme}://${ctx.input.host}:${ctx.input.managementPort}`;
      let axiosInstance = createAxios({ baseURL });
      let response: any;
      try {
        response = await axiosInstance.post(
          '/services/auth/login',
          `username=${encodeURIComponent(ctx.input.username)}&password=${encodeURIComponent(ctx.input.password)}&output_mode=json`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      } catch (error) {
        throw splunkApiError(error, 'authentication login');
      }

      let sessionKey = response.data?.sessionKey;
      if (!sessionKey) {
        throw splunkServiceError('Failed to obtain session key from Splunk.');
      }
      return {
        output: {
          token: sessionKey,
          hecToken: ctx.input.hecToken
        }
      };
    },
    getProfile: async (_ctx: { output: { token: string; hecToken?: string }; input: any }) => {
      return {
        profile: {}
      };
    }
  });
