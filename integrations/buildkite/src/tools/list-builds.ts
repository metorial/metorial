import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { organizationInput, paginationOutput } from '../lib/schemas';
import { spec } from '../spec';

let buildSchema = z.object({
  buildId: z.string().describe('UUID of the build'),
  buildNumber: z.number().describe('Build number within the pipeline'),
  pipelineSlug: z.string().describe('Pipeline slug from list_pipelines'),
  state: z
    .string()
    .describe('Current state (running, scheduled, passed, failed, blocked, canceled, etc.)'),
  branch: z.string().describe('Branch the build ran on'),
  commit: z.string().describe('Commit SHA'),
  message: z.string().nullable().describe('Build message'),
  webUrl: z.string().describe('URL to the build on Buildkite'),
  createdAt: z.string().describe('When the build was created'),
  startedAt: z.string().nullable().describe('When the build started running'),
  finishedAt: z.string().nullable().describe('When the build finished'),
  creatorName: z.string().nullable().describe('Name of the user who created the build')
});

export let listBuilds = SlateTool.create(spec, {
  name: 'List Builds',
  key: 'list_builds',
  description: `List builds across all pipelines or for a specific pipeline. Supports filtering by state, branch, commit, and creation date. Builds are returned newest-first.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...organizationInput,
      pipelineSlug: z
        .string()
        .optional()
        .describe(
          'Filter builds to a specific pipeline slug. If omitted, lists builds across all pipelines.'
        ),
      state: z
        .enum([
          'running',
          'scheduled',
          'passed',
          'failed',
          'blocked',
          'canceled',
          'canceling',
          'skipped',
          'not_run',
          'finished',
          'creating',
          'failing'
        ])
        .optional()
        .describe('Filter by build state'),
      branch: z.string().optional().describe('Filter by branch name'),
      commit: z.string().optional().describe('Filter by commit SHA'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter builds created after this date (ISO 8601 format)'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter builds created before this date (ISO 8601 format)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      ...paginationOutput,
      builds: z.array(buildSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let builds = await client.listBuilds(ctx.input);

    let mapped = builds.map(b => ({
      buildId: b.id,
      buildNumber: b.number,
      pipelineSlug: b.pipeline?.slug ?? '',
      state: b.state,
      branch: b.branch,
      commit: b.commit,
      message: b.message ?? null,
      webUrl: b.web_url,
      createdAt: b.created_at,
      startedAt: b.started_at ?? null,
      finishedAt: b.finished_at ?? null,
      creatorName: b.creator?.name ?? null
    }));

    return {
      output: { builds: mapped, ...client.pagination },
      message: `Found **${mapped.length}** build(s).`
    };
  });
