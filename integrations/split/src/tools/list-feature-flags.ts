import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validatePagination } from '../lib/validation';
import { spec } from '../spec';

export let listFeatureFlags = SlateTool.create(spec, {
  name: 'List Feature Flags',
  key: 'list_feature_flags',
  description: `List feature flags in a Split workspace. Supports filtering by name or tag and pagination. Returns flag metadata including name, description, traffic type, tags, and rollout status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      flagName: z.string().optional().describe('Filter flags by name (partial match).'),
      tag: z.string().optional().describe('Filter flags by tag (case-sensitive exact match).'),
      offset: z.number().optional().describe('Pagination offset. Defaults to 0.'),
      limit: z.number().optional().describe('Max results to return. Defaults to 50.')
    })
  )
  .output(
    z.object({
      flags: z.array(
        z.object({
          flagId: z.string(),
          flagName: z.string(),
          description: z.string().nullable(),
          trafficTypeName: z.string(),
          trafficTypeId: z.string(),
          creationTime: z.number(),
          tags: z.array(z.string()),
          rolloutStatus: z.string().nullable().optional()
        })
      ),
      totalCount: z
        .number()
        .describe(
          'Provider-reported total for the workspace and tag filter, before local name filtering.'
        ),
      matchingCount: z
        .number()
        .optional()
        .describe('Total flags matching flagName when the local name filter is used.'),
      offset: z.number(),
      limit: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then pass the ID or set the default workspace.'
      );
    }

    validatePagination(ctx.input.offset, ctx.input.limit, 50);
    let client = new Client(ctx.auth);
    let result = await client.listFeatureFlags(wsId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      tag: ctx.input.tag,
      name: ctx.input.flagName
    });

    let flags = result.objects.map(f => ({
      flagId: f.id,
      flagName: f.name,
      description: f.description ?? null,
      trafficTypeName: f.trafficType.name,
      trafficTypeId: f.trafficType.id,
      creationTime: f.creationTime,
      tags: (f.tags ?? []).map(t => t.name),
      rolloutStatus: f.rolloutStatus?.name ?? null
    }));

    return {
      output: {
        flags,
        totalCount: result.totalCount,
        matchingCount: result.matchingCount,
        offset: result.offset,
        limit: result.limit
      },
      message: `Found **${result.matchingCount ?? result.totalCount}** ${result.matchingCount !== undefined ? 'matching ' : ''}feature flags. Returned ${flags.length} starting at offset ${result.offset}.`
    };
  })
  .build();
