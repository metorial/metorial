import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let manageFileContent = SlateTool.create(spec, {
  name: 'Manage File Content',
  key: 'manage_file_content',
  description: `Read, create, update, or delete a file in a GitHub repository.
- **read**: Retrieve file contents (decoded from Base64).
- **write**: Create or update a file. Provide Base64-encoded content and a commit message.
- **delete**: Delete a file. Requires the file's current SHA and a commit message.`,
  instructions: [
    'For read operations, only owner, repo, path, and optionally ref are needed.',
    'For write operations, file content must be Base64-encoded.',
    'For update/delete, provide the current SHA of the file to avoid conflicts.'
  ]
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('File path relative to the repo root'),
      action: z.enum(['read', 'write', 'delete']).describe('Operation to perform'),
      ref: z.string().optional().describe('Branch/tag/commit to read from (only for read)'),
      content: z
        .string()
        .optional()
        .describe('Base64-encoded file content (required for write)'),
      commitMessage: z
        .string()
        .optional()
        .describe('Commit message (required for write/delete)'),
      sha: z.string().optional().describe('Current file SHA (required for update/delete)'),
      branch: z.string().optional().describe('Branch to commit to (for write/delete)')
    })
  )
  .output(
    z.object({
      path: z.string().describe('File path'),
      sha: z.string().optional().describe('File SHA'),
      content: z.string().optional().describe('Decoded file content (for read)'),
      size: z.number().optional().describe('File size in bytes'),
      htmlUrl: z.string().optional().describe('URL to the file on GitHub'),
      commitSha: z.string().optional().describe('Commit SHA (for write/delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, path, action } = ctx.input;

    if (action === 'read') {
      let file = await client.getContent(owner, repo, path, ctx.input.ref);

      let content: string | undefined;
      if (file.content && file.encoding === 'base64') {
        content = atob(file.content);
      }

      return {
        output: {
          path: file.path,
          sha: file.sha,
          content,
          size: file.size,
          htmlUrl: file.html_url
        },
        message: `Read file **${file.path}** (${file.size} bytes) from **${owner}/${repo}**.`
      };
    }

    if (action === 'write') {
      if (!ctx.input.content || !ctx.input.commitMessage) {
        throw new Error('content and commitMessage are required for write operations.');
      }

      let result = await client.createOrUpdateFile(owner, repo, path, {
        message: ctx.input.commitMessage,
        content: ctx.input.content,
        sha: ctx.input.sha,
        branch: ctx.input.branch
      });

      return {
        output: {
          path: result.content.path,
          sha: result.content.sha,
          htmlUrl: result.content.html_url,
          commitSha: result.commit.sha
        },
        message: `${ctx.input.sha ? 'Updated' : 'Created'} file **${path}** in **${owner}/${repo}** (commit: \`${result.commit.sha.slice(0, 7)}\`).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.sha || !ctx.input.commitMessage) {
        throw new Error('sha and commitMessage are required for delete operations.');
      }

      let result = await client.deleteFile(owner, repo, path, {
        message: ctx.input.commitMessage,
        sha: ctx.input.sha,
        branch: ctx.input.branch
      });

      return {
        output: {
          path,
          commitSha: result.commit.sha
        },
        message: `Deleted file **${path}** from **${owner}/${repo}** (commit: \`${result.commit.sha.slice(0, 7)}\`).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
