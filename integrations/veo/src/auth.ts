import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let getTokenUrl = (environment: string) =>
  environment === 'development'
    ? 'https://tokenapiuat.veo.co.uk/oauth2/token'
    : 'https://tokenapi.veo.co.uk/oauth2/token';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      environment: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'VEO Credentials',
    key: 'veo_credentials',

    inputSchema: z.object({
      username: z.string().describe('Your VEO email address'),
      password: z.string().describe('Your VEO password'),
      clientId: z.string().describe('Client ID provided by your VEO representative'),
      clientSecret: z.string().describe('Client secret provided by your VEO representative'),
      environment: z
        .enum(['production', 'development'])
        .default('production')
        .describe('VEO environment')
    }),

    getOutput: async ctx => {
      let tokenUrl = getTokenUrl(ctx.input.environment);

      let http = createAxios();

      let params = new URLSearchParams();
      params.append('Username', ctx.input.username);
      params.append('Password', ctx.input.password);
      params.append('Grant_type', 'password');
      params.append('Client_id', ctx.input.clientId);

      let response = await http.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: {
          username: ctx.input.clientId,
          password: ctx.input.clientSecret
        }
      });

      return {
        output: {
          token: response.data.access_token,
          environment: ctx.input.environment
        }
      };
    }
  });
