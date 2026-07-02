import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let startBuild = SlateTool.create(spec, {
  name: 'Start Build',
  key: 'start_build',
  description: `Start a new build for a project. Supports building the latest commit on a branch, a specific commit, or a pull request. Custom environment variables can be passed to the build.`,
  instructions: [
    'Provide at least a branch to build the latest commit on that branch.',
    'Optionally specify commitId to build a specific commit.',
    'Optionally specify pullRequestId to build a pull request.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountName: z.string().describe('Account name that owns the project'),
      projectSlug: z.string().describe('Project URL slug'),
      branch: z
        .string()
        .optional()
        .describe('Branch to build (defaults to project default branch)'),
      commitId: z.string().optional().describe('Specific commit SHA to build'),
      pullRequestId: z.number().optional().describe('Pull request number to build'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom environment variables for the build')
    })
  )
  .output(
    z.object({
      buildId: z.number().describe('Build identifier'),
      buildNumber: z.number().describe('Build number'),
      version: z.string().describe('Build version string'),
      status: z.string().describe('Build status'),
      branch: z.string().optional().describe('Branch being built')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.startBuild({
      accountName: ctx.input.accountName,
      projectSlug: ctx.input.projectSlug,
      branch: ctx.input.branch,
      commitId: ctx.input.commitId,
      pullRequestId: ctx.input.pullRequestId,
      environmentVariables: ctx.input.environmentVariables
    });

    let build = result as any;

    return {
      output: {
        buildId: build.buildId,
        buildNumber: build.buildNumber,
        version: build.version,
        status: build.status,
        branch: build.branch
      },
      message: `Started build **${build.version}** (${build.status}) for **${ctx.input.accountName}/${ctx.input.projectSlug}**.`
    };
  })
  .build();
