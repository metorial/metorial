import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { resolveWorkspaceId, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listIntegrationsTool = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `List available integrations in a Botpress workspace. Search by name, filter by visibility (public/private), or retrieve a specific integration by ID or name. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      integrationId: z.string().optional().describe('Get a specific integration by ID'),
      integrationName: z.string().optional().describe('Get a specific integration by name'),
      integrationVersion: z
        .string()
        .optional()
        .describe(
          'Version or semver range for lookup by integrationName; defaults to latest.'
        ),
      search: z.string().optional().describe('Search integrations by keyword'),
      visibility: z
        .enum(['public', 'private', 'unlisted'])
        .optional()
        .describe('Filter by visibility'),
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
    if (ctx.input.integrationId && ctx.input.integrationName)
      throw createApiServiceError('Provide only one of integrationId or integrationName.');
    if (ctx.input.integrationVersion && !ctx.input.integrationName)
      throw createApiServiceError('integrationVersion requires integrationName.');
    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: resolveWorkspaceId(ctx.input.workspaceId, ctx.config)
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
      let result = await client.getIntegrationByName(
        ctx.input.integrationName,
        ctx.input.integrationVersion
      );
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
