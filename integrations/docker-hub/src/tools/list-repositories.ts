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
        .describe('Number of results per page (default 25, max 100).')
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
          lastUpdated: z.string().describe('ISO timestamp of the last update.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace;
    if (!ns) {
      ns = ctx.auth.username;
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listRepositories(ns, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
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
          lastUpdated: r.last_updated
        }))
      },
      message: `Found **${result.count}** repositories in namespace **${ns}**.`
    };
  })
  .build();
