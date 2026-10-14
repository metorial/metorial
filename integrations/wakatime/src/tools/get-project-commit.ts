import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let commitResponseSchema = z.object({
  commit: z.object({
    hash: z.string(),
    message: z.string().nullish(),
    author_name: z.string().nullish(),
    author_date: z.string().nullish(),
    total_seconds: z.number().nullish(),
    human_readable_total: z.string().nullish(),
    html_url: z.string().nullish(),
    url: z.string().nullish()
  }),
  project: z
    .object({
      id: z.string(),
      name: z.string(),
      repository: z
        .object({ html_url: z.string().nullish(), url: z.string().nullish() })
        .nullish()
    })
    .nullish(),
  branch: z.string().nullish(),
  status: z.string().nullish()
});

export let getProjectCommit = SlateTool.create(spec, {
  name: 'Get Project Commit',
  key: 'get_project_commit',
  description:
    'Read coding time and repository details for a single project commit. Use list_projects for project IDs and get_project_commits for commit hashes. Requires a connected repository.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID from list_projects'),
      commitHash: z.string().describe('Commit hash from get_project_commits'),
      branch: z
        .string()
        .optional()
        .describe('Branch to filter by; defaults to the repository default branch')
    })
  )
  .output(
    z.object({
      commit: z.object({
        commitHash: z.string(),
        message: z.string(),
        authorName: z.string().optional(),
        authorDate: z.string().optional(),
        totalSeconds: z.number(),
        humanReadableTotal: z.string().optional(),
        url: z.string().optional()
      }),
      project: z
        .object({
          projectId: z.string(),
          name: z.string(),
          repositoryUrl: z.string().optional()
        })
        .optional(),
      branch: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new WakaTimeClient(ctx.auth).getCommit(
      ctx.input.projectId,
      ctx.input.commitHash,
      ctx.input.branch
    );
    let parsed = commitResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError(
        'WakaTime did not return commit details. Check the project and commit hash, or retry after repository syncing completes.'
      );
    }
    let result = parsed.data;
    let commit = result.commit;
    return {
      output: {
        commit: {
          commitHash: commit.hash,
          message: commit.message ?? '',
          authorName: commit.author_name ?? undefined,
          authorDate: commit.author_date ?? undefined,
          totalSeconds: commit.total_seconds ?? 0,
          humanReadableTotal: commit.human_readable_total ?? undefined,
          url: commit.html_url ?? commit.url ?? undefined
        },
        project: result.project
          ? {
              projectId: result.project.id,
              name: result.project.name,
              repositoryUrl:
                result.project.repository?.html_url ??
                result.project.repository?.url ??
                undefined
            }
          : undefined,
        branch: result.branch ?? undefined,
        status: result.status ?? undefined
      },
      message: `Retrieved coding time for commit **${ctx.input.commitHash}**: **${commit.human_readable_total ?? '0 secs'}**.`
    };
  })
  .build();
