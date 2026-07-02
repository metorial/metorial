import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let outputSchema = z.object({
  token: z.string()
});

type AuthOutput = z.infer<typeof outputSchema>;

let fetchProfile = async (token: string) => {
  let http = createAxios({
    baseURL: 'https://api.pushbullet.com',
    headers: {
      'Access-Token': token
    }
  });

  let response = await http.get('/v2/users/me');
  let user = response.data as {
    iden: string;
    email: string;
    name: string;
    image_url?: string;
  };

  return {
    profile: {
      id: user.iden,
      email: user.email,
      name: user.name,
      imageUrl: user.image_url
    }
  };
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      return {
        url: `https://www.pushbullet.com/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: 'https://api.pushbullet.com'
      });

      let response = await http.post('/oauth2/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code
      });

      let data = response.data as { access_token: string };

      return {
        output: {
          token: data.access_token
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      return fetchProfile(ctx.output.token);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Pushbullet access token from https://www.pushbullet.com/#settings/account'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput }) => {
      return fetchProfile(ctx.output.token);
    }
  });
