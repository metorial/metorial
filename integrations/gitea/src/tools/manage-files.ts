import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import type { GiteaFileResponse } from '../lib/types';
import { validateBase64 } from '../lib/validation';
import { spec } from '../spec';

export let getFileContent = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description: `DEPRECATED — use \`download_file\` instead. Read a file's content from a repository. Returns the file metadata and base64-encoded content. Supports reading from a specific branch or commit ref.`,
  instructions: ['Use download_file to receive a downloadable file and its current blob SHA.'],
  tags: {
    deprecated: true,
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().min(1).describe('Repository owner'),
      repo: z.string().min(1).describe('Repository name'),
      path: z.string().describe('File path within the repository (e.g., "src/main.ts")'),
      ref: z
        .string()
        .optional()
        .describe(
          'Branch name, tag, or commit SHA to read from; defaults to the default branch'
        )
    })
  )
  .output(
    z.object({
      name: z.string().describe('File name'),
      path: z.string().describe('Full file path'),
      sha: z.string().describe('File blob SHA'),
      size: z.number().describe('File size in bytes'),
      content: z.string().describe('Base64-encoded file content'),
      encoding: z.string().describe('Content encoding (typically base64)'),
      htmlUrl: z.string().describe('Web URL to view the file'),
      downloadUrl: z.string().describe('Direct download URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
    let f = await client.getFileContent(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.path,
      ctx.input.ref
    );

    return {
      output: {
        name: f.name,
        path: f.path,
        sha: f.sha,
        size: f.size,
        content: f.content,
        encoding: f.encoding,
        htmlUrl: f.html_url,
        downloadUrl: f.download_url
      },
      message: `Retrieved file **${f.path}** (${f.size} bytes) from **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let createOrUpdateFile = SlateTool.create(spec, {
  name: 'Create or Update File',
  key: 'create_or_update_file',
  description: `Create a new file or update an existing file in a repository. Content must be base64-encoded. When updating, provide the current file SHA to prevent conflicts.`,
  instructions: [
    'To create a new file, omit the fileSha parameter.',
    'To update an existing file, provide the fileSha of the current version. Use the "Get File Content" tool to retrieve the current SHA.',
    'Content must be base64-encoded.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().min(1).describe('Repository owner'),
      repo: z.string().min(1).describe('Repository name'),
      path: z.string().describe('File path within the repository'),
      content: z.string().describe('Base64-encoded file content'),
      message: z.string().describe('Commit message for the file change'),
      branch: z.string().optional().describe('Target branch; defaults to the default branch'),
      fileSha: z
        .string()
        .optional()
        .describe('Current SHA of the file (required for updates, omit for new files)'),
      authorName: z.string().optional().describe('Commit author name'),
      authorEmail: z.string().optional().describe('Commit author email')
    })
  )
  .output(
    z.object({
      path: z.string().describe('File path'),
      sha: z.string().describe('New file blob SHA'),
      commitSha: z.string().describe('Commit SHA for the change'),
      commitMessage: z.string().describe('Commit message'),
      htmlUrl: z.string().describe('Web URL to view the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
    if ((ctx.input.authorName === undefined) !== (ctx.input.authorEmail === undefined))
      throw createApiServiceError('Provide authorName and authorEmail together.');
    const content = validateBase64(ctx.input.content);
    let author =
      ctx.input.authorName && ctx.input.authorEmail
        ? { name: ctx.input.authorName, email: ctx.input.authorEmail }
        : undefined;

    let result: GiteaFileResponse;
    if (ctx.input.fileSha) {
      result = await client.updateFile(ctx.input.owner, ctx.input.repo, ctx.input.path, {
        content,
        message: ctx.input.message,
        sha: ctx.input.fileSha,
        branch: ctx.input.branch,
        author
      });
    } else {
      result = await client.createFile(ctx.input.owner, ctx.input.repo, ctx.input.path, {
        content,
        message: ctx.input.message,
        branch: ctx.input.branch,
        author
      });
    }

    return {
      output: {
        path: result.content.path,
        sha: result.content.sha,
        commitSha: result.commit.sha,
        commitMessage: result.commit.message,
        htmlUrl: result.content.html_url
      },
      message: `${ctx.input.fileSha ? 'Updated' : 'Created'} file **${result.content.path}** in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from a repository. Requires the current file SHA to prevent accidental deletion of modified files.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().min(1).describe('Repository owner'),
      repo: z.string().min(1).describe('Repository name'),
      path: z.string().describe('File path to delete'),
      fileSha: z
        .string()
        .describe('Current SHA of the file (use "Get File Content" to retrieve it)'),
      message: z.string().describe('Commit message for the deletion'),
      branch: z
        .string()
        .optional()
        .describe('Branch to delete from; defaults to the default branch')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the file was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
    await client.deleteFile(ctx.input.owner, ctx.input.repo, ctx.input.path, {
      message: ctx.input.message,
      sha: ctx.input.fileSha,
      branch: ctx.input.branch
    });

    return {
      output: { deleted: true },
      message: `Deleted file **${ctx.input.path}** from **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();
