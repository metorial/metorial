import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let getBuild = SlateTool.create(spec, {
  name: 'Get Build',
  key: 'get_build',
  description: `Retrieve detailed information about a specific build, including its state, duration, commit details, and associated jobs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      buildId: z.string().describe('Numeric build ID.')
    })
  )
  .output(
    z.object({
      buildId: z.number().describe('Unique build ID'),
      buildNumber: z.string().describe('Build number'),
      state: z.string().describe('Build state'),
      duration: z.number().nullable().describe('Build duration in seconds'),
      eventType: z.string().describe('Event that triggered the build'),
      previousState: z.string().nullable().optional().describe('Previous build state'),
      branch: z.string().optional().describe('Branch name'),
      commitSha: z.string().optional().describe('Commit SHA'),
      commitMessage: z.string().optional().describe('Commit message'),
      commitAuthor: z.string().optional().describe('Commit author name'),
      startedAt: z.string().nullable().describe('Build start timestamp'),
      finishedAt: z.string().nullable().describe('Build finish timestamp'),
      repositorySlug: z.string().optional().describe('Repository slug'),
      pullRequestTitle: z
        .string()
        .nullable()
        .optional()
        .describe('Pull request title, if applicable'),
      pullRequestNumber: z
        .number()
        .nullable()
        .optional()
        .describe('Pull request number, if applicable'),
      jobs: z
        .array(
          z.object({
            jobId: z.number().describe('Job ID'),
            state: z.string().optional().describe('Job state')
          })
        )
        .optional()
        .describe('Jobs associated with this build')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let build = await client.getBuild(ctx.input.buildId);

    let jobs = (build.jobs || []).map((job: any) => ({
      jobId: job.id,
      state: job.state
    }));

    return {
      output: {
        buildId: build.id,
        buildNumber: build.number,
        state: build.state,
        duration: build.duration ?? null,
        eventType: build.event_type,
        previousState: build.previous_state ?? null,
        branch: build.branch?.name,
        commitSha: build.commit?.sha,
        commitMessage: build.commit?.message,
        commitAuthor: build.commit?.author_name,
        startedAt: build.started_at ?? null,
        finishedAt: build.finished_at ?? null,
        repositorySlug: build.repository?.slug,
        pullRequestTitle: build.pull_request_title ?? null,
        pullRequestNumber: build.pull_request_number ?? null,
        jobs
      },
      message: `Build **#${build.number}** is **${build.state}** on branch **${build.branch?.name || 'unknown'}** (${build.event_type}).`
    };
  })
  .build();
