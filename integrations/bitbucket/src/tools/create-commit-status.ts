import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCommitStatusTool = SlateTool.create(spec, {
  name: 'Create Commit Status',
  key: 'create_commit_status',
  description: `Create or update a build status on a specific commit. Typically used by CI/CD tools to report build results.
The **key** uniquely identifies the status — updating with the same key replaces the previous status.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      commitHash: z.string().describe('Full commit hash'),
      state: z
        .enum(['SUCCESSFUL', 'FAILED', 'INPROGRESS', 'STOPPED'])
        .describe('Build status state'),
      key: z.string().describe('Unique key for this build status'),
      name: z.string().optional().describe('Human-readable name for the build'),
      description: z.string().optional().describe('Description of the build status'),
      url: z.string().optional().describe('URL linking to the build details')
    })
  )
  .output(
    z.object({
      key: z.string(),
      state: z.string(),
      name: z.string().optional(),
      url: z.string().optional(),
      createdOn: z.string().optional(),
      updatedOn: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let body: Record<string, any> = {
      state: ctx.input.state,
      key: ctx.input.key
    };
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.url) body.url = ctx.input.url;

    let status = await client.createCommitStatus(
      ctx.input.repoSlug,
      ctx.input.commitHash,
      body
    );

    return {
      output: {
        key: status.key,
        state: status.state,
        name: status.name || undefined,
        url: status.url || undefined,
        createdOn: status.created_on || undefined,
        updatedOn: status.updated_on || undefined
      },
      message: `Set commit status **${status.key}** to **${status.state}** on ${ctx.input.commitHash.slice(0, 12)}.`
    };
  })
  .build();
