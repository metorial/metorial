import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageFile = SlateTool.create(spec, {
  name: 'Manage Repository File',
  key: 'manage_file',
  description: `Create, update, or delete a file in a GitLab repository. Each operation creates a commit. Provide file content and a commit message. For binary files, use base64 encoding.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create_or_update', 'delete'])
        .describe('Operation: create/update a file, or delete it'),
      projectId: z.string().describe('Project ID or URL-encoded path'),
      filePath: z.string().describe('Path to the file in the repository'),
      branch: z.string().describe('Branch to commit to'),
      commitMessage: z.string().describe('Commit message for the change'),
      content: z.string().optional().describe('File content (required for create/update)'),
      encoding: z
        .enum(['text', 'base64'])
        .optional()
        .describe('Content encoding (defaults to text)'),
      startBranch: z
        .string()
        .optional()
        .describe("Create the target branch from this branch if it doesn't exist")
    })
  )
  .output(
    z.object({
      filePath: z.string().describe('Path to the file'),
      branch: z.string().describe('Branch the commit was made on')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'create_or_update') {
      if (!ctx.input.content && ctx.input.content !== '')
        throw gitLabServiceError('Content is required for create/update');
      await client.createOrUpdateFile(ctx.input.projectId, ctx.input.filePath, {
        branch: ctx.input.branch,
        content: ctx.input.content!,
        commitMessage: ctx.input.commitMessage,
        encoding: ctx.input.encoding,
        startBranch: ctx.input.startBranch
      });
      return {
        output: {
          filePath: ctx.input.filePath,
          branch: ctx.input.branch
        },
        message: `Committed file \`${ctx.input.filePath}\` to branch \`${ctx.input.branch}\``
      };
    } else {
      await client.deleteFile(ctx.input.projectId, ctx.input.filePath, {
        branch: ctx.input.branch,
        commitMessage: ctx.input.commitMessage
      });
      return {
        output: {
          filePath: ctx.input.filePath,
          branch: ctx.input.branch
        },
        message: `Deleted file \`${ctx.input.filePath}\` from branch \`${ctx.input.branch}\``
      };
    }
  })
  .build();
