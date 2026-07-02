import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { getBaseUrl } from './lib/regions';

type Region = 'eu' | 'us' | 'ca' | 'ap' | 'cn';

let scopes = [
  { title: 'Read Content', description: 'Read content from the space', scope: 'read_content' },
  {
    title: 'Write Content',
    description: 'Write and manage content in the space',
    scope: 'write_content'
  }
];

function createStoryblokOauth(name: string, key: string, region: Region) {
  let baseUrl = getBaseUrl(region);

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });
      return { url: `https://app.storyblok.com/oauth/authorize?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let client = createAxios({ baseURL: baseUrl });
      let response = await client.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });
      let data = response.data as { access_token?: string; error?: string };
      if (!data.access_token) {
        throw new Error(`Storyblok OAuth error: ${data.error || 'No access token received'}`);
      }
      return {
        output: {
          token: data.access_token,
          region
        }
      };
    },

    getProfile: async (ctx: any) => {
      let client = createAxios({
        baseURL: baseUrl,
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      try {
        let response = await client.get('/users/me');
        let data = response.data as { user?: any };
        return {
          profile: {
            id: data.user?.id?.toString(),
            email: data.user?.email,
            name:
              [data.user?.firstname, data.user?.lastname].filter(Boolean).join(' ') ||
              undefined,
            imageUrl: data.user?.avatar
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  };
}

function createStoryblokPat(name: string, key: string, region: Region) {
  let baseUrl = getBaseUrl(region);
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal Access Token from My Account > Account Settings > Personal access tokens'
        )
    }),
    getOutput: async (ctx: { input: { token: string } }) => ({
      output: {
        token: ctx.input.token,
        region
      }
    }),
    getProfile: async (ctx: any) => {
      let client = createAxios({
        baseURL: baseUrl,
        headers: { Authorization: ctx.output.token }
      });
      try {
        let response = await client.get('/users/me');
        let data = response.data as { user?: any };
        return {
          profile: {
            id: data.user?.id?.toString(),
            email: data.user?.email,
            name:
              [data.user?.firstname, data.user?.lastname].filter(Boolean).join(' ') ||
              undefined,
            imageUrl: data.user?.avatar
          }
        };
      } catch {
        return { profile: {} };
      }
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      region: z.enum(['eu', 'us', 'ca', 'ap', 'cn'])
    })
  )
  .addOauth(createStoryblokOauth('Europe (EU)', 'oauth_eu', 'eu'))
  .addOauth(createStoryblokOauth('United States (US)', 'oauth_us', 'us'))
  .addOauth(createStoryblokOauth('Canada (CA)', 'oauth_ca', 'ca'))
  .addOauth(createStoryblokOauth('Asia-Pacific (AP)', 'oauth_ap', 'ap'))
  .addOauth(createStoryblokOauth('China (CN)', 'oauth_cn', 'cn'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (EU)', 'pat_eu', 'eu'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (US)', 'pat_us', 'us'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (CA)', 'pat_ca', 'ca'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (AP)', 'pat_ap', 'ap'))
  .addTokenAuth(createStoryblokPat('Personal Access Token (CN)', 'pat_cn', 'cn'));
