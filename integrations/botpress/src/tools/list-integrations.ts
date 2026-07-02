import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export let listIntegrationsTool = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `List available integrations in a Botpress workspace. Search by name, filter by visibility (public/private), or retrieve a specific integration by ID or name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to config workspaceId.'),
      integrationId: z.string().optional().describe('Get a specific integration by ID'),
      integrationName: z.string().optional().describe('Get a specific integration by name'),
      search: z.string().optional().describe('Search integrations by keyword'),
      visibility: z.enum(['public', 'private']).optional().describe('Filter by visibility'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      integration: z
        .object({
          integrationId: z.string(),
          name: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          version: z.string().optional(),
          visibility: z.string().optional()
        })
        .optional(),
      integrations: z
        .array(
          z.object({
            integrationId: z.string(),
            name: z.string(),
            title: z.string().optional(),
            description: z.string().optional(),
            version: z.string().optional(),
            visibility: z.string().optional()
          })
        )
        .optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId || ctx.config.workspaceId
    });

    if (ctx.input.integrationId) {
      let result = await client.getIntegration(ctx.input.integrationId);
      let i = result.integration;
      return {
        output: {
          integration: {
            integrationId: i.id,
            name: i.name,
            title: i.title,
            description: i.description,
            version: i.version,
            visibility: i.visibility
          }
        },
        message: `Retrieved integration **${i.title || i.name}**.`
      };
    }

    if (ctx.input.integrationName) {
      let result = await client.getIntegrationByName(ctx.input.integrationName);
      let i = result.integration;
      return {
        output: {
          integration: {
            integrationId: i.id,
            name: i.name,
            title: i.title,
            description: i.description,
            version: i.version,
            visibility: i.visibility
          }
        },
        message: `Retrieved integration **${i.title || i.name}**.`
      };
    }

    let result = await client.listIntegrations({
      search: ctx.input.search,
      visibility: ctx.input.visibility,
      nextToken: ctx.input.nextToken
    });

    let integrations = (result.integrations || []).map((i: Record<string, unknown>) => ({
      integrationId: i.id as string,
      name: i.name as string,
      title: i.title as string | undefined,
      description: i.description as string | undefined,
      version: i.version as string | undefined,
      visibility: i.visibility as string | undefined
    }));

    return {
      output: { integrations, nextToken: result.meta?.nextToken },
      message: `Found **${integrations.length}** integration(s).`
    };
  })
  .build();
