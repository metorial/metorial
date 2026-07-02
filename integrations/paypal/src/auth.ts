import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { paypalApiError } from './lib/errors';

let getBaseUrl = (environment?: string) =>
  environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      environment: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('PayPal REST API Client ID'),
      clientSecret: z.string().describe('PayPal REST API Client Secret'),
      environment: z
        .enum(['sandbox', 'production'])
        .default('production')
        .describe('PayPal environment')
    }),

    getOutput: async ctx => {
      let baseUrl = getBaseUrl(ctx.input.environment);
      let client = createAxios({ baseURL: baseUrl });

      let credentials = btoa(`${ctx.input.clientId}:${ctx.input.clientSecret}`);

      let response: any;
      try {
        response = await client.post('/v1/oauth2/token', 'grant_type=client_credentials', {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      } catch (error) {
        throw paypalApiError(error, 'token exchange');
      }

      let data = response.data as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      return {
        output: {
          token: data.access_token,
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret,
          environment: ctx.input.environment
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; clientId: string; clientSecret: string; environment?: string };
      input: { clientId: string; clientSecret: string; environment: string };
    }) => {
      let baseUrl = getBaseUrl(ctx.output.environment);
      let client = createAxios({ baseURL: baseUrl });

      try {
        let response = await client.get('/v1/identity/oauth2/userinfo?schema=paypalv1.1', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`,
            'Content-Type': 'application/json'
          }
        });

        let data = response.data as {
          user_id?: string;
          name?: string;
          emails?: Array<{ value: string; primary?: boolean }>;
          payer_id?: string;
        };

        let primaryEmail = data.emails?.find(e => e.primary)?.value || data.emails?.[0]?.value;

        return {
          profile: {
            id: data.payer_id || data.user_id,
            name: data.name,
            email: primaryEmail
          }
        };
      } catch {
        return {
          profile: {
            id: ctx.output.clientId,
            name: 'PayPal Merchant'
          }
        };
      }
    }
  });
