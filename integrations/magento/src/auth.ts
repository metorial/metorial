import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { magentoApiError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Integration access token generated in Magento Admin under System > Extensions > Integrations'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Admin Credentials',
    key: 'admin_credentials',

    inputSchema: z.object({
      storeUrl: z
        .string()
        .describe('Base URL of the Magento store (e.g. https://mystore.example.com)'),
      username: z.string().describe('Magento admin username'),
      password: z.string().describe('Magento admin password')
    }),

    getOutput: async ctx => {
      try {
        let axios = createAxios({
          baseURL: ctx.input.storeUrl.replace(/\/+$/, '')
        });

        let response = await axios.post('/rest/V1/integration/admin/token', {
          username: ctx.input.username,
          password: ctx.input.password
        });

        let token = response.data as string;

        return {
          output: {
            token
          }
        };
      } catch (error) {
        throw magentoApiError(error, 'authenticate admin credentials');
      }
    }
  });
