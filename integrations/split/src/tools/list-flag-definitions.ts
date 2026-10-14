import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flagDefinitionSchema, mapFlagDefinition } from '../lib/flag-definition';
import { validatePagination } from '../lib/validation';
import { spec } from '../spec';

export let listFlagDefinitions = SlateTool.create(spec, {
  name: 'List Flag Definitions',
  key: 'list_flag_definitions',
  description:
    'List a page of feature flag definitions in an environment, including targeting rules, treatments, traffic allocation, and kill status. Call list_workspaces and list_environments to discover the workspace and environment.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      environmentIdOrName: z
        .string()
        .optional()
        .describe(
          'Environment ID or case-sensitive name. Call list_environments to discover environments. Falls back to the configured default.'
        ),
      offset: z.number().optional().describe('Pagination offset. Defaults to 0.'),
      limit: z.number().optional().describe('Page size, between 1 and 50. Defaults to 50.')
    })
  )
  .output(
    z.object({
      definitions: z.array(
        flagDefinitionSchema.extend({
          flagName: z.string(),
          trafficTypeId: z.string(),
          trafficTypeName: z.string()
        })
      ),
      offset: z.number(),
      limit: z.number(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    let environment = ctx.input.environmentIdOrName ?? ctx.config.environmentId;
    if (!workspaceId)
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then provide a workspace.'
      );
    if (!environment)
      throw createApiServiceError(
        'environmentIdOrName is required. Call list_environments to discover environments, then provide an environment.'
      );
    validatePagination(ctx.input.offset, ctx.input.limit, 50);
    let client = new Client(ctx.auth);
    let page = await client.listFlagDefinitions(workspaceId, environment, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let definitions = page.objects.map(definition => ({
      ...mapFlagDefinition(definition),
      flagName: definition.name,
      trafficTypeId: definition.trafficType.id,
      trafficTypeName: definition.trafficType.name
    }));
    return {
      output: {
        definitions,
        offset: page.offset,
        limit: page.limit,
        totalCount: page.totalCount
      },
      message: `Returned **${definitions.length}** of **${page.totalCount}** feature flag definitions in environment **${environment}**.`
    };
  })
  .build();
