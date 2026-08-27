import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireEnvironmentKey, requireProjectKey } from '../lib/inputs';
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
        .describe(
          'Context filter expression, for example `kind equals "user",key equals "user-123"`'
        ),
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
          contextKey: z.string().optional().describe('Context key for a single-kind context'),
          contextInstanceId: z
            .string()
            .optional()
            .describe('Unique context instance ID returned by LaunchDarkly'),
          contextKinds: z
            .array(z.string())
            .describe('All context kinds included in this context instance'),
          name: z.string().optional().describe('Context name'),
          attributes: z.record(z.string(), z.any()).optional().describe('Context attributes'),
          lastSeen: z.string().optional().describe('Last seen timestamp'),
          applicationId: z
            .string()
            .optional()
            .describe('Application or SDK that sent the context'),
          context: z
            .record(z.string(), z.any())
            .optional()
            .describe('Complete LaunchDarkly context, including multi-context data'),
          associatedContexts: z
            .number()
            .optional()
            .describe('Number of associated contexts for this record')
        })
      ),
      totalCount: z.number().optional().describe('Total matching contexts'),
      continuationToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let envKey = requireEnvironmentKey(ctx.input.environmentKey, ctx.config.environmentKey);

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let result = await client.searchContexts(projectKey, envKey, {
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      continuationToken: ctx.input.continuationToken
    });

    let items = result.items ?? [];
    let contexts = items.map((c: any) => {
      let context = c.context ?? {};
      let contextKind = context.kind ?? 'user';
      let contextKey = typeof context.key === 'string' ? context.key : undefined;
      let contextKinds =
        contextKind === 'multi'
          ? Object.entries(context)
              .filter(
                ([key, value]) => key !== 'kind' && value !== null && typeof value === 'object'
              )
              .map(([key]) => key)
          : [contextKind];
      let name = context.name;
      let { kind: _kind, key: _key, name: _name, ...attributes } = context;

      return {
        contextKind,
        contextKey,
        contextInstanceId: c.id,
        contextKinds,
        name,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        lastSeen: c.lastSeen ? String(c.lastSeen) : undefined,
        applicationId: c.applicationId,
        context: Object.keys(context).length > 0 ? context : undefined,
        associatedContexts: c.associatedContexts
      };
    });

    return {
      output: {
        contexts,
        totalCount: result.totalCount,
        continuationToken: result.continuationToken
      },
      message: `Found **${contexts.length}** contexts in \`${envKey}\`.`
    };
  })
  .build();
