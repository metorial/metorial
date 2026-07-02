import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let searchContexts = SlateTool.create(spec, {
  name: 'Search Contexts',
  key: 'search_contexts',
  description: `Search for contexts (users, services, machines, etc.) that have encountered feature flags in an environment. Filter by kind, key, or attributes. Contexts are scoped to a specific project and environment.`,
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
      filter: z
        .string()
        .optional()
        .describe('Filter expression for contexts (e.g., \'kind:"user" key:"user-123"\')'),
      sort: z.string().optional().describe('Sort field (e.g., "-ts" for most recent)'),
      limit: z.number().optional().describe('Maximum number of contexts to return'),
      continuationToken: z.string().optional().describe('Continuation token for pagination')
    })
  )
  .output(
    z.object({
      contexts: z.array(
        z.object({
          contextKind: z.string().describe('Context kind'),
          contextKey: z.string().describe('Context key'),
          name: z.string().optional().describe('Context name'),
          attributes: z.record(z.string(), z.any()).optional().describe('Context attributes'),
          lastSeen: z.string().optional().describe('Last seen timestamp')
        })
      ),
      totalCount: z.number().optional().describe('Total matching contexts'),
      continuationToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error('projectKey is required.');
    }
    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    if (!envKey) {
      throw new Error('environmentKey is required.');
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.searchContexts(projectKey, envKey, {
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      continuationToken: ctx.input.continuationToken
    });

    let items = result.items ?? [];
    let contexts = items.map((c: any) => {
      let contextKind = c.kind ?? 'user';
      let contextKey = c.key ?? '';
      let name = c.name;
      let attributes: Record<string, any> = {};

      if (c.attributes) {
        attributes = c.attributes;
      }

      return {
        contextKind,
        contextKey,
        name,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        lastSeen: c.lastSeen ? String(c.lastSeen) : undefined
      };
    });

    return {
      output: {
        contexts,
        totalCount: result.totalCount,
        continuationToken: result._links?.next?.href ? result.continuationToken : undefined
      },
      message: `Found **${contexts.length}** contexts in \`${envKey}\`.`
    };
  })
  .build();
