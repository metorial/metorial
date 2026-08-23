import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireEnvironmentKey, requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List user segments in a LaunchDarkly environment. Segments group contexts for bulk flag targeting. Returns segment keys, names, and membership counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key. Falls back to config default.'),
      limit: z.number().optional().describe('Maximum number of segments to return'),
      offset: z.number().optional().describe('Offset for pagination'),
      filter: z.string().optional().describe('Filter expression'),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentKey: z.string().describe('Segment key'),
          name: z.string().describe('Segment name'),
          description: z.string().describe('Segment description'),
          tags: z.array(z.string()).describe('Segment tags'),
          includedCount: z.number().describe('Number of included targets'),
          excludedCount: z.number().describe('Number of excluded targets'),
          creationDate: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total number of segments')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let envKey = requireEnvironmentKey(ctx.input.environmentKey, ctx.config.environmentKey);

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let result = await client.listSegments(projectKey, envKey, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      filter: ctx.input.filter,
      sort: ctx.input.sort
    });

    let items = result.items ?? [];
    let segments = items.map((s: any) => ({
      segmentKey: s.key,
      name: s.name,
      description: s.description ?? '',
      tags: s.tags ?? [],
      includedCount:
        s._unboundedMetadata?.includedCount ??
        (s.included ?? []).length +
          (s.includedContexts ?? []).reduce(
            (count: number, targets: any) => count + (targets.values ?? []).length,
            0
          ),
      excludedCount:
        s._unboundedMetadata?.excludedCount ??
        (s.excluded ?? []).length +
          (s.excludedContexts ?? []).reduce(
            (count: number, targets: any) => count + (targets.values ?? []).length,
            0
          ),
      creationDate: String(s.creationDate)
    }));

    return {
      output: {
        segments,
        totalCount: result.totalCount ?? items.length
      },
      message: `Found **${result.totalCount ?? items.length}** segments in \`${envKey}\`.`
    };
  })
  .build();
