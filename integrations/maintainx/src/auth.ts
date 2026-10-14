import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      organizationId: z.string().optional(),
      requiresOrganizationId: z.boolean().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'MaintainX REST API key. Generate one from Settings > Integrations > API Keys > New Key.'
        )
    }),
    getOutput: async ctx => {
      let result = await new Client({ token: ctx.input.token }).listOrganizations({
        limit: 2
      });
      let organizations = result.organizations ?? [];
      if (!organizations.length) {
        throw createApiServiceError(
          'The MaintainX key has no accessible organizations. Check its permissions.'
        );
      }
      let singleOrganization = organizations.length === 1 && !result.nextCursor;
      return {
        output: {
          token: ctx.input.token,
          organizationId: singleOrganization ? String(organizations[0].id) : undefined,
          requiresOrganizationId: !singleOrganization
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; organizationId?: string } }) => {
      let result = await new Client({ token: ctx.output.token }).listOrganizations({
        limit: 2
      });
      let organizations = result.organizations ?? [];
      let singleOrganization = organizations.length === 1 && !result.nextCursor;
      return {
        profile: {
          id: singleOrganization ? String(organizations[0].id) : undefined,
          name: singleOrganization
            ? organizations[0].name
            : 'MaintainX multi-organization API key'
        }
      };
    }
  });
