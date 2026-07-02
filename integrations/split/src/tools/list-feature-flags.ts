import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
        .describe('Workspace ID. Falls back to the configured default.'),
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
      totalCount: z.number(),
      offset: z.number(),
      limit: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listFeatureFlags(wsId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      tag: ctx.input.tag,
      name: ctx.input.flagName
    });

    let flags = result.objects.map(f => ({
      flagId: f.id,
      flagName: f.name,
      description: f.description,
      trafficTypeName: f.trafficType.name,
      trafficTypeId: f.trafficType.id,
      creationTime: f.creationTime,
      tags: f.tags.map(t => t.name),
      rolloutStatus: f.rolloutStatus?.name ?? null
    }));

    return {
      output: {
        flags,
        totalCount: result.totalCount,
        offset: result.offset,
        limit: result.limit
      },
      message: `Found **${result.totalCount}** feature flags. Returned ${flags.length} starting at offset ${result.offset}.`
    };
  })
  .build();
