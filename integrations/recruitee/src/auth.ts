import { SlateAuth } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from './lib/client';
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      companyId: z.string().optional(),
      adminId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal ATS API token from Settings > Apps and plugins > Personal API tokens. It inherits your permissions for the company where it was generated.'
        )
    }),
    getOutput: async ctx => {
      let client = new RecruiteeClient({
        token: ctx.input.token,
        companyId: ctx.config?.companyId,
        companySubdomain: ctx.config?.companySubdomain
      });
      let identity = await client.identity();
      return {
        output: {
          token: ctx.input.token,
          companyId: String(identity.companyId),
          adminId: String(identity.adminId)
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; companyId?: string; adminId?: string };
      config?: { companyId?: string; companySubdomain?: string };
    }) => {
      let client = new RecruiteeClient({
        token: ctx.output.token,
        companyId: ctx.config?.companyId ?? ctx.output.companyId,
        companySubdomain: ctx.config?.companySubdomain,
        expectedCompanyId: ctx.output.companyId,
        expectedAdminId: ctx.output.adminId
      });
      let identity = await client.identity();
      return {
        profile: {
          id: String(identity.adminId),
          name:
            [identity.firstName, identity.lastName].filter(Boolean).join(' ') ||
            identity.email ||
            'Recruitee account',
          email: identity.email,
          companyId: String(identity.companyId)
        }
      };
    }
  });
