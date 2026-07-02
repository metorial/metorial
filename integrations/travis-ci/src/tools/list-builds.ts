import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let listBuilds = SlateTool.create(spec, {
  name: 'List Builds',
  key: 'list_builds',
  description: `List builds for a repository or for the authenticated user. Supports filtering by branch, state, and event type. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlugOrId: z
        .string()
        .optional()
        .describe(
          'Repository slug (e.g. "owner/repo") or numeric ID. If omitted, returns builds for the authenticated user.'
        ),
      branchName: z.string().optional().describe('Filter builds by branch name.'),
      state: z
        .enum(['created', 'received', 'started', 'passed', 'failed', 'errored', 'canceled'])
        .optional()
        .describe('Filter builds by state.'),
      eventType: z
        .enum(['push', 'pull_request', 'api', 'cron'])
        .optional()
        .describe('Filter builds by triggering event type.'),
      limit: z.number().optional().describe('Maximum number of builds to return.'),
      offset: z.number().optional().describe('Number of builds to skip for pagination.'),
      sortBy: z.string().optional().describe('Sort field, e.g. "id:desc", "started_at:desc".')
    })
  )
  .output(
    z.object({
      builds: z.array(
        z.object({
          buildId: z.number().describe('Unique build ID'),
          buildNumber: z.string().describe('Build number'),
          state: z.string().describe('Build state'),
          duration: z.number().nullable().describe('Build duration in seconds'),
          eventType: z.string().describe('Event that triggered the build'),
          branch: z.string().optional().describe('Branch name'),
          commitSha: z.string().optional().describe('Commit SHA'),
          commitMessage: z.string().optional().describe('Commit message'),
          startedAt: z.string().nullable().describe('Build start timestamp'),
          finishedAt: z.string().nullable().describe('Build finish timestamp'),
          repositorySlug: z.string().optional().describe('Repository slug')
        })
      ),
      totalCount: z.number().optional().describe('Total number of matching builds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listBuilds({
      repoSlugOrId: ctx.input.repoSlugOrId,
      branchName: ctx.input.branchName,
      state: ctx.input.state,
      eventType: ctx.input.eventType,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy
    });

    let builds = (result.builds || []).map((build: any) => ({
      buildId: build.id,
      buildNumber: build.number,
      state: build.state,
      duration: build.duration ?? null,
      eventType: build.event_type,
      branch: build.branch?.name,
      commitSha: build.commit?.sha,
      commitMessage: build.commit?.message,
      startedAt: build.started_at ?? null,
      finishedAt: build.finished_at ?? null,
      repositorySlug: build.repository?.slug
    }));

    return {
      output: {
        builds,
        totalCount: result['@pagination']?.count
      },
      message: `Found **${builds.length}** builds${ctx.input.repoSlugOrId ? ` for **${ctx.input.repoSlugOrId}**` : ''}.`
    };
  })
  .build();
