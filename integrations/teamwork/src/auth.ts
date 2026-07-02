import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiEndpoint: z
        .string()
        .optional()
        .describe('Regional API endpoint returned by OAuth token exchange')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [],

    inputSchema: z.object({
      siteName: z
        .string()
        .optional()
        .describe('Optional: specific Teamwork site name to target during login')
    }),

    getAuthorizationUrl: async ctx => {
      let baseUrl = ctx.input?.siteName
        ? `https://${ctx.input.siteName}.teamwork.com`
        : 'https://www.teamwork.com';

      let params = new URLSearchParams({
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        state: ctx.state
      });

      return {
        url: `${baseUrl}/launchpad/login?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({});

      let response = await axios.post('https://www.teamwork.com/launchpad/v1/token.json', {
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          apiEndpoint: data.installation?.apiEndPoint || data.apiEndPoint || undefined
        },
        input: ctx.input
      };
    },

    getProfile: async (ctx: {
      output: { token: string; apiEndpoint?: string };
      input: { siteName?: string };
      scopes: string[];
    }) => {
      let baseUrl = ctx.output.apiEndpoint || 'https://www.teamwork.com';
      let axios = createAxios({
        baseURL: baseUrl,
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/me.json');
      let person = (response.data as any)?.person;

      return {
        profile: {
          id: person?.id ? String(person.id) : undefined,
          email: person?.['email-address'] || person?.emailAddress || undefined,
          name:
            [
              person?.['first-name'] || person?.firstName,
              person?.['last-name'] || person?.lastName
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          imageUrl: person?.['avatar-url'] || person?.avatarUrl || undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Teamwork API key (found under Profile > API & Mobile)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let encoded = btoa(`${ctx.input.apiKey}:x`);
      let axios = createAxios({
        headers: {
          Authorization: `Basic ${encoded}`
        }
      });

      let response = await axios.get('https://www.teamwork.com/me.json');
      let person = (response.data as any)?.person;

      return {
        profile: {
          id: person?.id ? String(person.id) : undefined,
          email: person?.['email-address'] || person?.emailAddress || undefined,
          name:
            [
              person?.['first-name'] || person?.firstName,
              person?.['last-name'] || person?.lastName
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          imageUrl: person?.['avatar-url'] || person?.avatarUrl || undefined
        }
      };
    }
  });
