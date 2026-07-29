import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z
  .object({
    path: z.string().describe('path to the file'),
    content: z.string().describe('file content')
  })
  .strict();

export let pushFiles = SlateTool.create(spec, {
  name: 'Push Files to Repository',
  key: 'push_files',
  description: 'Push multiple files to a GitHub repository in a single commit.',
  instructions: [
    'All files are committed atomically to the requested branch through the Git data API.',
    'The branch is created from the repository default branch when it does not exist.'
  ],
  tags: { destructive: false }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branch: z.string().describe('Branch to push to'),
      files: z
        .array(fileSchema)
        .describe(
          'Array of file objects to push, each object with path (string) and content (string)'
        ),
      message: z.string().describe('Commit message')
    })
  )
  .output(
    z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string(),
      commitSha: z.string().describe('SHA of the created commit'),
      treeSha: z.string().describe('SHA of the created tree'),
      ref: z.string().describe('Updated full git ref'),
      files: z.array(z.object({ path: z.string() }))
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let result = await client.pushFiles(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.branch,
      ctx.input.files,
      ctx.input.message
    );

    return {
      output: {
        owner: ctx.input.owner,
        repo: ctx.input.repo,
        branch: ctx.input.branch,
        commitSha: result.commit.sha,
        treeSha: result.tree.sha,
        ref: result.ref.ref,
        files: ctx.input.files.map(file => ({ path: file.path }))
      },
      message: `Pushed **${ctx.input.files.length}** files to \`${ctx.input.branch}\` in **${ctx.input.owner}/${ctx.input.repo}** as commit \`${result.commit.sha}\`.`
    };
  })
  .build();
