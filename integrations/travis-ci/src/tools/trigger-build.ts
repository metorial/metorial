import { SlateTool } from 'slates';
import { z } from 'zod';
import { legacyBaseUrl, TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let triggerBuild = SlateTool.create(spec, {
  name: 'Trigger Build',
  key: 'trigger_build',
  description: `Trigger a new build for a repository. Optionally specify a branch, custom commit message, and override build configuration. The build request is queued and processed asynchronously.`,
  instructions: [
    'The config parameter accepts a partial Travis CI build configuration that overrides the repository .travis.yml.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug (e.g. "owner/repo") or numeric ID.'),
      branch: z
        .string()
        .optional()
        .describe('Branch to build. Defaults to the repository default branch.'),
      message: z.string().optional().describe('Custom message for the build request.'),
      sha: z.string().optional().describe('Specific commit SHA to build.'),
      mergeMode: z
        .enum(['deep_merge_append', 'deep_merge_prepend', 'deep_merge', 'merge', 'replace'])
        .optional()
        .describe(
          'How request config combines with .travis.yml. replace uses only request config; omission retains the provider default.'
        ),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom build configuration that overrides .travis.yml settings.')
    })
  )
  .output(
    z.object({
      requestId: z.number().optional().describe('ID of the created build request'),
      repositorySlug: z.string().optional().describe('Repository slug'),
      branch: z.string().optional().describe('Branch for the build'),
      message: z.string().optional().describe('Build request message'),
      remaining: z.number().optional().describe('Remaining build requests allowed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl(ctx.config)
    });

    let result = await client.triggerBuild(ctx.input.repoSlugOrId, {
      branch: ctx.input.branch,
      message: ctx.input.message,
      config: ctx.input.config,
      mergeMode: ctx.input.mergeMode,
      sha: ctx.input.sha
    });

    let request = result.request || result;
    let remaining = result.remaining_requests;

    return {
      output: {
        requestId: request.id,
        repositorySlug:
          result.repository?.slug || request.repository?.slug || ctx.input.repoSlugOrId,
        branch: request.branch || ctx.input.branch,
        message: request.message || ctx.input.message,
        remaining
      },
      message: `Build request queued for **${ctx.input.repoSlugOrId}**${ctx.input.branch ? ` on branch **${ctx.input.branch}**` : ''}. Request ID: ${request.id}.`
    };
  })
  .build();
