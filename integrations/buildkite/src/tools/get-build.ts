import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

let jobSummarySchema = z.object({
  jobId: z.string().describe('UUID of the job'),
  type: z.string().describe('Type of job (script, waiter, manual, trigger)'),
  name: z.string().nullable().describe('Name/label of the job step'),
  state: z.string().describe('Current state of the job'),
  exitStatus: z.number().nullable().describe('Exit status code if finished'),
  startedAt: z.string().nullable().describe('When the job started'),
  finishedAt: z.string().nullable().describe('When the job finished'),
  agentName: z.string().nullable().describe('Name of the agent that ran the job')
});

export let getBuild = SlateTool.create(spec, {
  name: 'Get Build',
  key: 'get_build',
  description: `Retrieve detailed information about a specific build including all its jobs/steps. Use this to inspect build results, check individual step statuses, and find job IDs for retrying or inspecting logs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...organizationInput,
      pipelineSlug: z.string().describe('Pipeline slug from list_pipelines'),
      buildNumber: z
        .number()
        .describe('Pipeline build number from list_builds, not a build UUID')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('UUID of the build'),
      buildNumber: z.number().describe('Build number'),
      state: z.string().describe('Current state of the build'),
      branch: z.string().describe('Branch the build ran on'),
      commit: z.string().describe('Commit SHA'),
      message: z.string().nullable().describe('Build message'),
      webUrl: z.string().describe('URL to the build on Buildkite'),
      createdAt: z.string().describe('When the build was created'),
      startedAt: z.string().nullable().describe('When the build started'),
      finishedAt: z.string().nullable().describe('When the build finished'),
      creatorName: z.string().nullable().describe('Name of the user who created the build'),
      env: z.record(z.string(), z.string()).describe('Environment variables set on the build'),
      metaData: z
        .record(z.string(), z.string())
        .describe(
          'Metadata set on the build; non-string provider values are represented as JSON strings'
        ),
      jobs: z.array(jobSummarySchema).describe('Jobs/steps in this build')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let b = await client.getBuild(ctx.input.pipelineSlug, ctx.input.buildNumber);

    let jobs = (b.jobs ?? []).map(j => ({
      jobId: j.id,
      type: j.type,
      name: j.name ?? j.label ?? null,
      state: j.state,
      exitStatus: j.exit_status ?? null,
      startedAt: j.started_at ?? null,
      finishedAt: j.finished_at ?? null,
      agentName: j.agent?.name ?? null
    }));

    return {
      output: {
        buildId: b.id,
        buildNumber: b.number,
        state: b.state,
        branch: b.branch,
        commit: b.commit,
        message: b.message ?? null,
        webUrl: b.web_url,
        createdAt: b.created_at,
        startedAt: b.started_at ?? null,
        finishedAt: b.finished_at ?? null,
        creatorName: b.creator?.name ?? null,
        env: b.env ?? {},
        metaData: Object.fromEntries(
          Object.entries(b.meta_data ?? {}).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : (JSON.stringify(value) ?? '')
          ])
        ),
        jobs
      },
      message: `Build **#${b.number}** is **${b.state}** with ${jobs.length} job(s).`
    };
  });
