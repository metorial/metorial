import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCode = SlateTool.create(spec, {
  name: 'Search Code',
  key: 'search_code',
  description: `Searches for code across repositories in the project. Supports filtering by repository, branch, file path, and file extension. Returns matching file paths with match locations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().describe('Search query text'),
      repositoryName: z.string().optional().describe('Filter by repository name'),
      branch: z.string().optional().describe('Filter by branch name'),
      path: z.string().optional().describe('Filter by file path prefix'),
      fileExtension: z
        .string()
        .optional()
        .describe('Filter by file extension (e.g., "ts", "py")'),
      top: z.number().optional().describe('Maximum number of results (default: 25)'),
      skip: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching results'),
      results: z.array(
        z.object({
          fileName: z.string().describe('Name of the matching file'),
          path: z.string().describe('Full path of the matching file'),
          repositoryName: z.string().describe('Name of the repository'),
          repositoryId: z.string().describe('ID of the repository'),
          projectName: z.string().describe('Name of the project'),
          branches: z.array(z.string()).describe('Branches containing the match'),
          matchLocations: z
            .record(
              z.string(),
              z.array(
                z.object({
                  charOffset: z.number(),
                  length: z.number()
                })
              )
            )
            .describe('Match locations indexed by field name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let searchResult = await client.searchCode(ctx.input.searchText, {
      repositoryName: ctx.input.repositoryName,
      branch: ctx.input.branch,
      path: ctx.input.path,
      fileExtension: ctx.input.fileExtension,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        totalCount: searchResult.count,
        results: searchResult.results.map(r => ({
          fileName: r.fileName,
          path: r.path,
          repositoryName: r.repository.name,
          repositoryId: r.repository.id,
          projectName: r.project?.name ?? ctx.config.project,
          branches: r.versions.map(v => v.branchName),
          matchLocations: r.matches
        }))
      },
      message: `Found **${searchResult.count}** results for "${ctx.input.searchText}".`
    };
  })
  .build();
