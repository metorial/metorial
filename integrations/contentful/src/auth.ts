import { SlateAuth } from 'slates';
import { z } from 'zod';
import { ContentfulClient } from './lib/client';
import { tokenValue } from './lib/http';
import { invalid } from './lib/schemas';

let region = z
  .enum(['us', 'eu'])
  .default('us')
  .describe('Contentful data residency region. Credentials must belong to this region.');
let output = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  mode: z.enum(['management', 'delivery', 'preview']).optional(),
  region: z.enum(['us', 'eu']).optional()
});
let unsupported = () =>
  invalid(
    'Contentful documents an OAuth access token in the redirect URL fragment. This connection callback supports authorization codes, so it cannot complete that flow. Use Personal Access Token with a CMA PAT or an externally obtained Contentful OAuth token. Existing stored OAuth tokens remain usable.'
  );
let profile = async (ctx: { output: z.output<typeof output> }) => {
  let user = await new ContentfulClient({
    token: ctx.output.token,
    mode: 'management',
    region: ctx.output.region ?? 'us',
    environmentId: 'master'
  }).getCurrentUser();
  return {
    profile: {
      id: user.sys.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
      email: user.email,
      imageUrl: user.avatarUrl
    }
  };
};
export let auth = SlateAuth.create()
  .output(output)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 (existing connections)',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Contentful OAuth fragment flow',
        url: 'https://www.contentful.com/developers/docs/extensibility/oauth/'
      }
    ],
    scopes: [
      {
        title: 'Content Management (Manage)',
        description: 'Read and write content accessible to the user.',
        scope: 'content_management_manage'
      }
    ],
    getAuthorizationUrl: async () => {
      throw unsupported();
    },
    handleCallback: async () => {
      throw unsupported();
    },
    handleTokenRefresh: async (ctx: { output: z.output<typeof output> }) => {
      if (ctx.output.refreshToken || ctx.output.expiresAt) throw unsupported();
      return { output: ctx.output };
    },
    getProfile: profile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'CMA personal access token or externally obtained Contentful OAuth management token.'
        ),
      region
    }),
    getOutput: async ctx => ({
      output: {
        token: tokenValue(ctx.input.token),
        mode: 'management' as const,
        region: ctx.input.region
      }
    }),
    getProfile: profile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Content Delivery API Key',
    key: 'delivery_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Production Content Delivery API key. It cannot write or discover the authenticated CMA user.'
        ),
      region
    }),
    getOutput: async ctx => ({
      output: {
        token: tokenValue(ctx.input.token),
        mode: 'delivery' as const,
        region: ctx.input.region
      }
    })
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Content Preview API Key',
    key: 'preview_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Separate Content Preview API key for draft and published content. Delivery API keys do not work here.'
        ),
      region
    }),
    getOutput: async ctx => ({
      output: {
        token: tokenValue(ctx.input.token),
        mode: 'preview' as const,
        region: ctx.input.region
      }
    })
  });
