import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List Docker image repositories under a namespace (user or organization). Returns repository metadata including visibility, star count, pull count, and last updated timestamp. Supports pagination for namespaces with many repositories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe(
          'Docker Hub namespace (username or organization). Falls back to configured default namespace.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default 10, max 100).'),
      name: z
        .string()
        .optional()
        .describe('Filter repositories by a partial repository name match.'),
      ordering: z
        .enum(['name', '-name', 'last_updated', '-last_updated', 'pull_count', '-pull_count'])
        .optional()
        .describe(
          'Order repositories by name, last_updated, or pull_count. Prefix with "-" for descending order.'
        )
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of repositories in the namespace.'),
      repositories: z.array(
        z.object({
          namespace: z.string().describe('Namespace the repository belongs to.'),
          repositoryName: z.string().describe('Name of the repository.'),
          description: z.string().describe('Short description of the repository.'),
          isPrivate: z.boolean().describe('Whether the repository is private.'),
          starCount: z.number().describe('Number of stars.'),
          pullCount: z.number().describe('Number of pulls.'),
          lastUpdated: z.string().describe('ISO timestamp of the last update.'),
          statusDescription: z.string().optional().describe('Repository status label.'),
          categories: z
            .array(
              z.object({
                name: z.string().describe('Category display name.'),
                slug: z.string().describe('Category slug.')
              })
            )
            .describe('Docker Hub repository categories.'),
          permissions: z
            .object({
              read: z.boolean().describe('Whether the caller can read the repository.'),
              write: z.boolean().describe('Whether the caller can write to the repository.'),
              admin: z.boolean().describe('Whether the caller can administer the repository.')
            })
            .optional()
            .describe('Caller permissions when returned by Docker Hub.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace;
    if (!ns) {
      ns = ctx.auth.username;
    }

    let client = new Client(ctx.auth);
    let result = await client.listRepositories(ns, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      name: ctx.input.name,
      ordering: ctx.input.ordering
    });

    return {
      output: {
        totalCount: result.count,
        repositories: result.results.map(r => ({
          namespace: r.namespace,
          repositoryName: r.name,
          description: r.description || '',
          isPrivate: r.is_private,
          starCount: r.star_count,
          pullCount: r.pull_count,
          lastUpdated: r.last_updated,
          statusDescription: r.status_description,
          categories: r.categories || [],
          permissions: r.permissions
        }))
      },
      message: `Found **${result.count}** repositories in namespace **${ns}**.`
    };
  })
  .build();
