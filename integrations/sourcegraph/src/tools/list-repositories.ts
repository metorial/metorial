import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List repositories connected to the Sourcegraph instance. Supports filtering by name query, pagination, and ordering.
Returns repository metadata including clone status, external source, and default branch.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Filter repositories by name'),
      first: z.number().optional().describe('Number of repositories to return (default 50)'),
      after: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      repositories: z
        .array(
          z.object({
            repositoryId: z.string().describe('Repository GraphQL ID'),
            name: z.string().describe('Full repository name'),
            url: z.string().describe('URL on the Sourcegraph instance'),
            description: z.string().optional().describe('Repository description'),
            cloned: z.boolean().optional().describe('Whether the repository has been cloned'),
            serviceType: z
              .string()
              .optional()
              .describe('Code host type (e.g., github, gitlab)'),
            defaultBranch: z.string().optional().describe('Default branch name')
          })
        )
        .describe('List of repositories'),
      totalCount: z.number().describe('Total number of matching repositories'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.listRepositories({
      query: ctx.input.query,
      first: ctx.input.first,
      after: ctx.input.after
    });

    let repos = data.repositories;
    let repositories = (repos.nodes || []).map((r: any) => ({
      repositoryId: r.id,
      name: r.name,
      url: r.url,
      description: r.description || undefined,
      cloned: r.mirrorInfo?.cloned,
      serviceType: r.externalRepository?.serviceType || undefined,
      defaultBranch: r.defaultBranch?.name || undefined
    }));

    return {
      output: {
        repositories,
        totalCount: repos.totalCount || 0,
        hasNextPage: repos.pageInfo?.hasNextPage || false,
        endCursor: repos.pageInfo?.endCursor || undefined
      },
      message: `Found **${repos.totalCount}** repositories${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}. Showing ${repositories.length}.`
    };
  })
  .build();
