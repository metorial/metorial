import { anyOf, buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let runSecretScanning = SlateTool.create(spec, {
  name: 'Run Secret Scanning',
  key: 'run_secret_scanning',
  description:
    'Scan raw file contents, snippets, or recent diffs with GitHub for exposed API keys, passwords, tokens, and other credentials. The supplied content is sent to GitHub for an ephemeral pre-commit scan and is not persisted as a repository secret scanning alert.',
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      files: z
        .union([z.string().min(1), z.array(z.string()).min(1).max(100)])
        .describe(
          'A single string or up to 100 strings containing raw file contents, snippets, or diff hunks. Do not provide file paths, files outside the codebase, or content from ignored files.'
        )
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository whose security policy governed the scan'),
      result: z
        .string()
        .describe(
          'GitHub secret scanning result, including detected secret locations and related metadata when findings exist'
        ),
      ephemeral: z
        .literal(true)
        .describe(
          'Whether the result is session-only and was not stored as a repository alert'
        )
    })
  )
  .handleInvocation(async ctx => {
    let values = Array.isArray(ctx.input.files) ? ctx.input.files : [ctx.input.files];
    if (values.every(value => value.length === 0)) {
      throw createApiServiceError('files must contain non-empty code or diff content.', {
        reason: 'github_secret_scanning_empty_content'
      });
    }

    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    try {
      let result = await client.runSecretScanning(
        ctx.input.owner,
        ctx.input.repo,
        ctx.input.files
      );
      return {
        output: {
          repository: `${ctx.input.owner}/${ctx.input.repo}`,
          result,
          ephemeral: true as const
        },
        message: `Completed an ephemeral secret scan for **${ctx.input.owner}/${ctx.input.repo}**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation: 'run secret scanning',
        reason: 'github_secret_scanning_failed',
        nestedKeys: ['errors']
      });
    }
  })
  .build();
