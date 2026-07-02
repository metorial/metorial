import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let listFeatureFlags = SlateTool.create(spec, {
  name: 'List Feature Flags',
  key: 'list_feature_flags',
  description: `List feature flags in a LaunchDarkly project. Supports filtering by tag, environment, and search query. Returns flag keys, names, kinds, and their current status in the specified environment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Falls back to config default if not provided.'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key to include environment-specific flag status'),
      tag: z.string().optional().describe('Filter flags by tag'),
      filter: z
        .string()
        .optional()
        .describe('LaunchDarkly filter expression (e.g., "query:my-flag")'),
      limit: z.number().optional().describe('Maximum number of flags to return (default 20)'),
      offset: z.number().optional().describe('Offset for pagination'),
      sort: z.string().optional().describe('Sort field (e.g., "creationDate", "-name")')
    })
  )
  .output(
    z.object({
      flags: z.array(
        z.object({
          flagKey: z.string().describe('Flag key identifier'),
          name: z.string().describe('Flag display name'),
          description: z.string().describe('Flag description'),
          kind: z.string().describe('Flag kind (boolean, multivariate, etc.)'),
          temporary: z.boolean().describe('Whether the flag is marked as temporary'),
          tags: z.array(z.string()).describe('Tags associated with the flag'),
          creationDate: z.string().describe('Flag creation timestamp (ms since epoch)'),
          variationCount: z.number().describe('Number of variations'),
          on: z
            .boolean()
            .optional()
            .describe('Whether the flag is on in the requested environment')
        })
      ),
      totalCount: z.number().describe('Total number of flags matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error(
        'projectKey is required. Provide it in the input or set a default in config.'
      );
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.listFeatureFlags(projectKey, {
      env: ctx.input.environmentKey ?? ctx.config.environmentKey,
      tag: ctx.input.tag,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      summary: true
    });

    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    let items = result.items ?? [];

    let flags = items.map((flag: any) => {
      let envConfig = envKey && flag.environments?.[envKey];
      return {
        flagKey: flag.key,
        name: flag.name,
        description: flag.description ?? '',
        kind: flag.kind,
        temporary: flag.temporary ?? false,
        tags: flag.tags ?? [],
        creationDate: String(flag.creationDate),
        variationCount: (flag.variations ?? []).length,
        on: envConfig ? envConfig.on : undefined
      };
    });

    return {
      output: {
        flags,
        totalCount: result.totalCount ?? items.length
      },
      message: `Found **${result.totalCount ?? items.length}** feature flags in project \`${projectKey}\`.`
    };
  })
  .build();
