import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRepositoriesTool = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List repositories in the configured workspace. Supports filtering by query and pagination.
Use the **query** parameter for Bitbucket's query language filtering (e.g. \`name ~ "myrepo"\`).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Bitbucket query language filter (e.g. name ~ "myrepo")'),
      sort: z
        .string()
        .optional()
        .describe('Field to sort by, prefix with - for descending (e.g. "-updated_on")'),
      page: z.number().optional().describe('Page number for pagination'),
      pageLen: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      repositories: z.array(
        z.object({
          repoSlug: z.string(),
          name: z.string(),
          fullName: z.string(),
          description: z.string().optional(),
          isPrivate: z.boolean(),
          language: z.string().optional(),
          createdOn: z.string().optional(),
          updatedOn: z.string().optional(),
          mainBranch: z.string().optional(),
          htmlUrl: z.string().optional()
        })
      ),
      totalCount: z.number().optional(),
      page: z.number().optional(),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let result = await client.listRepositories({
      query: ctx.input.query,
      sort: ctx.input.sort,
      page: ctx.input.page,
      pageLen: ctx.input.pageLen
    });

    let repositories = (result.values || []).map((r: any) => ({
      repoSlug: r.slug,
      name: r.name,
      fullName: r.full_name,
      description: r.description || undefined,
      isPrivate: r.is_private,
      language: r.language || undefined,
      createdOn: r.created_on,
      updatedOn: r.updated_on,
      mainBranch: r.mainbranch?.name || undefined,
      htmlUrl: r.links?.html?.href || undefined
    }));

    return {
      output: {
        repositories,
        totalCount: result.size,
        page: result.page,
        hasNextPage: !!result.next
      },
      message: `Found **${repositories.length}** repositories${result.size ? ` (${result.size} total)` : ''}.`
    };
  })
  .build();
