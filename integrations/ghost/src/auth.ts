import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { generateGhostJwt } from './lib/jwt';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Admin API key in the format {id}:{secret} or a staff access token'),
      contentApiKey: z
        .string()
        .optional()
        .describe('Content API key for read-only access to published content')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Admin API Key',
    key: 'admin_api_key',

    inputSchema: z.object({
      adminApiKey: z
        .string()
        .describe('Admin API key from Ghost Custom Integration (format: {id}:{secret})'),
      contentApiKey: z
        .string()
        .optional()
        .describe(
          'Content API key from Ghost Custom Integration (optional, for read-only content access)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.adminApiKey,
          contentApiKey: ctx.input.contentApiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let jwt = await generateGhostJwt(ctx.output.token);

      let http = createAxios({
        headers: {
          Authorization: `Ghost ${jwt}`,
          'Accept-Version': 'v5.0',
          'Content-Type': 'application/json'
        }
      });

      let domain = ctx.config?.adminDomain;
      if (!domain) {
        return { profile: {} };
      }

      let response = await http.get(`https://${domain}/ghost/api/admin/site/`);
      let site = response.data.site;

      return {
        profile: {
          id: domain,
          name: site?.title ?? domain,
          imageUrl: site?.icon ?? site?.logo
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Staff Access Token',
    key: 'staff_access_token',

    inputSchema: z.object({
      staffToken: z.string().describe('Staff access token from your Ghost user settings page'),
      contentApiKey: z
        .string()
        .optional()
        .describe(
          'Content API key from Ghost Custom Integration (optional, for read-only content access)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.staffToken,
          contentApiKey: ctx.input.contentApiKey
        }
      };
    },

    getProfile: async (ctx: any) => {
      let jwt = await generateGhostJwt(ctx.output.token);

      let http = createAxios({
        headers: {
          Authorization: `Ghost ${jwt}`,
          'Accept-Version': 'v5.0',
          'Content-Type': 'application/json'
        }
      });

      let domain = ctx.config?.adminDomain;
      if (!domain) {
        return { profile: {} };
      }

      let response = await http.get(`https://${domain}/ghost/api/admin/site/`);
      let site = response.data.site;

      return {
        profile: {
          id: domain,
          name: site?.title ?? domain,
          imageUrl: site?.icon ?? site?.logo
        }
      };
    }
  });
