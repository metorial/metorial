import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

type AuthOutput = {
  token: string;
  username: string;
  uid: number;
};

type ApiKeyInput = {
  username: string;
  token: string;
  instanceUrl: string;
  database: string;
};

type PasswordInput = {
  username: string;
  password: string;
  instanceUrl: string;
  database: string;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string(),
      uid: z.number()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Login email for the Odoo user'),
      token: z
        .string()
        .describe(
          'API Key generated from user profile settings (Odoo v14+). Used in place of password.'
        ),
      instanceUrl: z
        .string()
        .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
      database: z.string().describe('The Odoo database name')
    }),

    getOutput: async (ctx: { input: ApiKeyInput }) => {
      let axios = createAxios();
      let response = await axios.post(`${ctx.input.instanceUrl.replace(/\/+$/, '')}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: {
          service: 'common',
          method: 'authenticate',
          args: [ctx.input.database, ctx.input.username, ctx.input.token, {}]
        }
      });

      let uid = response.data?.result;
      if (!uid || typeof uid !== 'number') {
        throw new Error(
          'Authentication failed. Please check your credentials, instance URL, and database name.'
        );
      }

      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username,
          uid
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: ApiKeyInput }) => {
      return {
        profile: {
          id: String(ctx.output.uid),
          email: ctx.output.username,
          name: ctx.output.username
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'username_password',

    inputSchema: z.object({
      username: z.string().describe('Login email for the Odoo user'),
      password: z.string().describe('Password for the Odoo user'),
      instanceUrl: z
        .string()
        .describe('The URL of the Odoo instance (e.g., https://mycompany.odoo.com)'),
      database: z.string().describe('The Odoo database name')
    }),

    getOutput: async (ctx: { input: PasswordInput }) => {
      let axios = createAxios();
      let response = await axios.post(`${ctx.input.instanceUrl.replace(/\/+$/, '')}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: {
          service: 'common',
          method: 'authenticate',
          args: [ctx.input.database, ctx.input.username, ctx.input.password, {}]
        }
      });

      let uid = response.data?.result;
      if (!uid || typeof uid !== 'number') {
        throw new Error(
          'Authentication failed. Please check your credentials, instance URL, and database name.'
        );
      }

      return {
        output: {
          token: ctx.input.password,
          username: ctx.input.username,
          uid
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: PasswordInput }) => {
      return {
        profile: {
          id: String(ctx.output.uid),
          email: ctx.output.username,
          name: ctx.output.username
        }
      };
    }
  });
