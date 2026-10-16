import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listToolPatterns = SlateTool.create(spec, {
  name: 'List Repository Tool Patterns',
  key: 'list_tool_patterns',
  description:
    'Discover configured code patterns for a repository analysis tool, including pattern IDs, definitions, enabled state, parameters, and coding standards. Call list_repository_tools to discover tool UUIDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Repository name from list_repositories.'),
      toolUuid: z.string().describe('Tool UUID from list_repository_tools.'),
      enabled: z.boolean().optional().describe('Filter enabled or disabled patterns.'),
      search: z.string().optional().describe('Search patterns.'),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional()
    })
  )
  .output(
    z.object({
      patterns: z.array(z.unknown()),
      cursor: z.string().optional(),
      total: z.number().optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let { repositoryName, toolUuid, ...params } = ctx.input;
    let response = await createClient(ctx).listRepositoryToolPatterns(
      repositoryName,
      toolUuid,
      params
    );
    return {
      output: {
        patterns: response.data,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total,
        raw: response
      },
      message: 'Retrieved configured code patterns.'
    };
  })
  .build();
