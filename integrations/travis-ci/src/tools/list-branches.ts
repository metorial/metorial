import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `List branches for a repository with their latest build status. Useful for checking the CI status of each branch. Optionally retrieve detailed info for a specific branch.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug (e.g. "owner/repo") or numeric ID.'),
      branchName: z
        .string()
        .optional()
        .describe(
          'Specific branch name to retrieve. If provided, returns details for that branch only.'
        ),
      existsOnGithub: z
        .boolean()
        .optional()
        .describe('Filter branches by whether they exist on GitHub.'),
      limit: z.number().optional().describe('Maximum number of branches to return.'),
      offset: z.number().optional().describe('Number of branches to skip for pagination.'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort field. Options: name, last_build, exists_on_github, default_branch. Append :desc for reverse.'
        )
    })
  )
  .output(
    z.object({
      branches: z
        .array(
          z.object({
            name: z.string().describe('Branch name'),
            isDefault: z.boolean().optional().describe('Whether this is the default branch'),
            existsOnGithub: z
              .boolean()
              .optional()
              .describe('Whether the branch exists on GitHub'),
            lastBuildId: z.number().optional().describe('Last build ID'),
            lastBuildNumber: z.string().optional().describe('Last build number'),
            lastBuildState: z.string().optional().describe('Last build state'),
            lastBuildDuration: z
              .number()
              .nullable()
              .optional()
              .describe('Last build duration in seconds'),
            lastBuildStartedAt: z
              .string()
              .nullable()
              .optional()
              .describe('Last build start timestamp'),
            lastBuildFinishedAt: z
              .string()
              .nullable()
              .optional()
              .describe('Last build finish timestamp')
          })
        )
        .optional()
        .describe('List of branches'),
      branch: z
        .object({
          name: z.string().describe('Branch name'),
          isDefault: z.boolean().optional().describe('Whether this is the default branch'),
          existsOnGithub: z
            .boolean()
            .optional()
            .describe('Whether the branch exists on GitHub'),
          lastBuildId: z.number().optional().describe('Last build ID'),
          lastBuildNumber: z.string().optional().describe('Last build number'),
          lastBuildState: z.string().optional().describe('Last build state'),
          lastBuildDuration: z
            .number()
            .nullable()
            .optional()
            .describe('Last build duration in seconds'),
          lastBuildStartedAt: z
            .string()
            .nullable()
            .optional()
            .describe('Last build start timestamp'),
          lastBuildFinishedAt: z
            .string()
            .nullable()
            .optional()
            .describe('Last build finish timestamp')
        })
        .optional()
        .describe('Single branch details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let mapBranch = (branch: any) => ({
      name: branch.name,
      isDefault: branch.default_branch,
      existsOnGithub: branch.exists_on_github,
      lastBuildId: branch.last_build?.id,
      lastBuildNumber: branch.last_build?.number,
      lastBuildState: branch.last_build?.state,
      lastBuildDuration: branch.last_build?.duration ?? null,
      lastBuildStartedAt: branch.last_build?.started_at ?? null,
      lastBuildFinishedAt: branch.last_build?.finished_at ?? null
    });

    if (ctx.input.branchName) {
      let result = await client.getBranch(ctx.input.repoSlugOrId, ctx.input.branchName);
      let branch = mapBranch(result);
      return {
        output: { branch },
        message: `Branch **${result.name}** last build: **${result.last_build?.state || 'none'}**.`
      };
    }

    let result = await client.listBranches(ctx.input.repoSlugOrId, {
      existsOnGithub: ctx.input.existsOnGithub,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy
    });

    let branches = (result.branches || []).map(mapBranch);

    return {
      output: { branches },
      message: `Found **${branches.length}** branches for **${ctx.input.repoSlugOrId}**.`
    };
  })
  .build();
