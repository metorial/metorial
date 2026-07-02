import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getProjectCommits = SlateTool.create(spec, {
  name: 'Get Project Commits',
  key: 'get_project_commits',
  description: `Retrieve commit history for a specific project with time-spent-coding data per commit. Commits can be filtered by author and branch. Requires a connected repository (GitHub, Bitbucket, or GitLab).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to get commits for'),
      author: z.string().optional().describe('Filter by commit author username'),
      branch: z.string().optional().describe('Filter by branch name'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      commits: z
        .array(
          z
            .object({
              commitHash: z.string().describe('Git commit hash'),
              message: z.string().describe('Commit message'),
              authorName: z.string().optional().describe('Author name'),
              authorEmail: z.string().optional().describe('Author email'),
              authorDate: z.string().optional().describe('Commit date'),
              branch: z.string().optional().describe('Branch name'),
              totalSeconds: z
                .number()
                .optional()
                .describe('Time spent coding for this commit'),
              humanReadableTotal: z
                .string()
                .optional()
                .describe('Human-readable time for this commit'),
              url: z.string().optional().describe('URL to the commit')
            })
            .passthrough()
        )
        .describe('List of commits'),
      totalCommits: z.number().describe('Total number of commits'),
      totalPages: z.number().optional().describe('Total pages available'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result = await client.getCommits(ctx.input.projectId, {
      author: ctx.input.author,
      branch: ctx.input.branch,
      page: ctx.input.page
    });

    let commits = (result.commits || []).map((c: any) => ({
      commitHash: c.hash ?? '',
      message: c.message ?? '',
      authorName: c.author_name,
      authorEmail: c.author_email,
      authorDate: c.author_date,
      branch: c.branch,
      totalSeconds: c.total_seconds,
      humanReadableTotal: c.human_readable_total,
      url: c.url || c.html_url
    }));

    return {
      output: {
        commits,
        totalCommits: result.total ?? commits.length,
        totalPages: result.total_pages,
        currentPage: result.page
      },
      message: `Retrieved **${commits.length}** commit(s) for project.`
    };
  })
  .build();
