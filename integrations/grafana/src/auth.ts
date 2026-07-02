import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Account Token',
    key: 'service_account_token',
    inputSchema: z.object({
      instanceUrl: z
        .string()
        .describe('Base URL of the Grafana instance, e.g. https://your-grafana.grafana.net'),
      token: z
        .string()
        .describe(
          'Grafana Service Account token. Create one under Administration > Users and access > Service Accounts.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { instanceUrl: string; token: string };
    }) => {
      let baseUrl = ctx.input.instanceUrl.replace(/\/+$/, '');
      let axios = createAxios();
      let response = await axios.get(`${baseUrl}/api/org`, {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        profile: {
          id: String(response.data.id),
          name: response.data.name
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Authentication',
    key: 'basic_auth',
    inputSchema: z.object({
      instanceUrl: z
        .string()
        .describe('Base URL of the Grafana instance, e.g. https://your-grafana.grafana.net'),
      username: z.string().describe('Grafana username'),
      password: z.string().describe('Grafana password')
    }),
    getOutput: async ctx => {
      let token = Buffer.from(`${ctx.input.username}:${ctx.input.password}`).toString(
        'base64'
      );
      return {
        output: {
          token: `Basic ${token}`
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { instanceUrl: string; username: string; password: string };
    }) => {
      let baseUrl = ctx.input.instanceUrl.replace(/\/+$/, '');
      let axios = createAxios();
      let response = await axios.get(`${baseUrl}/api/user`, {
        headers: {
          Authorization: ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      return {
        profile: {
          id: String(response.data.id),
          email: response.data.email,
          name: response.data.name || response.data.login
        }
      };
    }
  });
