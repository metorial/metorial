import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBuild = SlateTool.create(spec, {
  name: 'Create Build',
  key: 'create_build',
  description: `Trigger a new build for a Buildkite pipeline. Specify the commit SHA and branch, and optionally set a message, environment variables, and metadata. Use commit "HEAD" to build the latest commit on the branch.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline to build'),
      commit: z
        .string()
        .describe('Commit SHA to build (use "HEAD" for the latest commit on the branch)'),
      branch: z.string().describe('Branch to build'),
      message: z
        .string()
        .optional()
        .describe('Build message (defaults to the commit message)'),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables to set for the build'),
      metaData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata key-value pairs to attach to the build'),
      ignorePipelineBranchFilters: z
        .boolean()
        .optional()
        .describe('Ignore pipeline branch filter settings'),
      cleanCheckout: z.boolean().optional().describe('Force a clean checkout for this build')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('UUID of the created build'),
      buildNumber: z.number().describe('Build number'),
      state: z.string().describe('Initial state of the build'),
      webUrl: z.string().describe('URL to the build on Buildkite'),
      createdAt: z.string().describe('When the build was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let b = await client.createBuild(ctx.input.pipelineSlug, {
      commit: ctx.input.commit,
      branch: ctx.input.branch,
      message: ctx.input.message,
      env: ctx.input.env,
      metaData: ctx.input.metaData,
      ignorePipelineBranchFilters: ctx.input.ignorePipelineBranchFilters,
      cleanCheckout: ctx.input.cleanCheckout
    });

    return {
      output: {
        buildId: b.id,
        buildNumber: b.number,
        state: b.state,
        webUrl: b.web_url,
        createdAt: b.created_at
      },
      message: `Triggered build **#${b.number}** on \`${ctx.input.branch}\` (${b.state}).`
    };
  });
