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
    name: 'API Access Key',
    key: 'api_access_key',
    inputSchema: z.object({
      apiAccessKey: z
        .string()
        .describe(
          'Your Eversign API Access Key. Found in the Developer section of your account settings.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiAccessKey
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string };
      input: { apiAccessKey: string };
    }) => {
      let axios = createAxios({
        baseURL: 'https://api.eversign.com'
      });
      let response = await axios.get('/business', {
        params: { access_key: ctx.output.token }
      });
      let businesses = response.data as Array<{ business_id: number; business_name: string }>;
      let primary = businesses[0];
      return {
        profile: {
          id: primary ? String(primary.business_id) : undefined,
          name: primary ? primary.business_name : undefined
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Full Access',
        description:
          'Full access to create, manage, and sign documents on behalf of the user.',
        scope: 'full_access'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let url = `https://app.eversign.com/oauth/authorize?client_id=${encodeURIComponent(ctx.clientId)}&state=${encodeURIComponent(ctx.state)}`;
      return { url };
    },
    handleCallback: async ctx => {
      let axios = createAxios({
        baseURL: 'https://app.eversign.com'
      });

      let formData = new URLSearchParams();
      formData.append('client_id', ctx.clientId);
      formData.append('client_secret', ctx.clientSecret);
      formData.append('code', ctx.code);
      formData.append('state', ctx.state);

      let response = await axios.post('/oauth/token', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let data = response.data as { access_token: string };

      return {
        output: {
          token: data.access_token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: {}; scopes: string[] }) => {
      let axios = createAxios({
        baseURL: 'https://api.eversign.com'
      });
      let response = await axios.get('/business', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let businesses = response.data as Array<{ business_id: number; business_name: string }>;
      let primary = businesses[0];
      return {
        profile: {
          id: primary ? String(primary.business_id) : undefined,
          name: primary ? primary.business_name : undefined
        }
      };
    }
  });
