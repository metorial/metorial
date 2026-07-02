import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchRepositories = SlateTool.create(spec, {
  name: 'Search Repositories',
  key: 'search_repositories',
  description: `Search for public Docker Hub repositories by keyword. Discovers images for operating systems, frameworks, databases, and more from the Docker Hub content library.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query to find repositories (e.g., "nginx", "python", "postgres").'),
      page: z.number().optional().describe('Page number for pagination (starts at 1).'),
      pageSize: z.number().optional().describe('Number of results per page (default 25).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching repositories.'),
      repositories: z.array(
        z.object({
          repoName: z.string().describe('Full repository name (namespace/name).'),
          shortDescription: z.string().describe('Short description of the repository.'),
          starCount: z.number().describe('Number of stars.'),
          pullCount: z.number().describe('Number of pulls.'),
          isOfficial: z.boolean().describe('Whether this is an official Docker image.'),
          isAutomated: z.boolean().describe('Whether this repository uses automated builds.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchRepositories(ctx.input.query, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        repositories: result.results.map(r => ({
          repoName: r.repo_name,
          shortDescription: r.short_description || '',
          starCount: r.star_count,
          pullCount: r.pull_count,
          isOfficial: r.is_official,
          isAutomated: r.is_automated
        }))
      },
      message: `Found **${result.count}** repositories matching **"${ctx.input.query}"**.`
    };
  })
  .build();
