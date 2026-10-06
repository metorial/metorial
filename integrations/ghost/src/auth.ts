import { SlateAuth } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from './lib/client';
import { type GhostAuth, siteUrl } from './lib/connection';
import { validateAdminKey } from './lib/jwt';
import { invalid, one } from './lib/schemas';

const urlInput = z
  .string()
  .describe(
    'Ghost Admin site HTTPS URL, including any site subdirectory. This may differ from the public site URL.'
  );
const contentKey = z
  .string()
  .optional()
  .describe(
    'Optional Content API key for explicit published-content reads. It never grants Admin access.'
  );
async function profile(output: GhostAuth) {
  const client = new GhostAdminClient({
    domain: output.siteUrl!,
    apiKey: output.token,
    contentApiKey: output.contentApiKey,
    mode: output.authMode
  });
  await client.browsePosts({ limit: 1, fields: 'id' });
  const site = (await client.readSite()).site;
  let imageUrl: string | undefined;
  if (site.icon || site.logo) {
    try {
      const u = new URL(site.icon ?? site.logo, output.siteUrl);
      if (u.protocol === 'https:' && !u.username && !u.password) imageUrl = u.href;
    } catch {
      throw invalid('Ghost returned an invalid site image URL.');
    }
  }
  return {
    profile: {
      id: output.siteUrl!,
      name: site.title,
      ...(imageUrl ? { imageUrl } : {})
    }
  };
}
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Ghost credential'),
      contentApiKey: z.string().optional(),
      siteUrl: z.string().optional(),
      authMode: z.enum(['admin_api_key', 'staff_access_token', 'content_api_key']).optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Admin API Key',
    key: 'admin_api_key',
    inputSchema: z.object({
      adminApiKey: z.string().describe('Ghost Custom Integration Admin key as id:hex-secret.'),
      contentApiKey: contentKey,
      siteUrl: urlInput
    }),
    getOutput: async ctx => {
      const output: GhostAuth = {
        token: validateAdminKey(ctx.input.adminApiKey),
        contentApiKey: ctx.input.contentApiKey,
        siteUrl: siteUrl(ctx.input.siteUrl),
        authMode: 'admin_api_key'
      };
      await profile(output);
      return { output };
    },
    getProfile: async (ctx: { output: GhostAuth }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Staff Access Token',
    key: 'staff_access_token',
    inputSchema: z.object({
      staffToken: z
        .string()
        .describe(
          'Original staff key as id:hex-secret from the staff profile. Not a previously generated JWT.'
        ),
      contentApiKey: contentKey,
      siteUrl: urlInput
    }),
    getOutput: async ctx => {
      const output: GhostAuth = {
        token: validateAdminKey(ctx.input.staffToken),
        contentApiKey: ctx.input.contentApiKey,
        siteUrl: siteUrl(ctx.input.siteUrl),
        authMode: 'staff_access_token'
      };
      const client = new GhostAdminClient({
        domain: output.siteUrl!,
        apiKey: output.token,
        mode: output.authMode
      });
      one(await client.readUser('me'), 'users');
      return { output };
    },
    getProfile: async (ctx: { output: GhostAuth }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Content API Key',
    key: 'content_api_key',
    inputSchema: z.object({
      contentApiKey: z
        .string()
        .describe('Published-content key from a Ghost Custom Integration.'),
      siteUrl: urlInput
    }),
    getOutput: async ctx => {
      const output: GhostAuth = {
        token: ctx.input.contentApiKey,
        siteUrl: siteUrl(ctx.input.siteUrl),
        authMode: 'content_api_key'
      };
      await profile(output);
      return { output };
    },
    getProfile: async (ctx: { output: GhostAuth }) => profile(ctx.output)
  });
