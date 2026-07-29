import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { contentEntrySchema, mapContentEntry } from './repository-read-contracts';

export let getFileContents = SlateTool.create(spec, {
  name: 'Get File or Directory Contents',
  key: 'get_file_contents',
  description:
    'Get a file or directory from a GitHub repository. Files are returned as downloadable content; directories return entry metadata.',
  instructions: [
    'Omit path or use "/" to list the repository root.',
    'When sha is supplied it takes precedence over ref.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (username or organization)'),
      repo: z.string().describe('Repository name'),
      path: z.string().default('/').describe('Path to a file or directory'),
      ref: z
        .string()
        .optional()
        .describe('Git ref such as refs/tags/{tag}, refs/heads/{branch}, or a pull ref'),
      sha: z.string().optional().describe('Commit SHA; used instead of ref when provided')
    })
  )
  .output(
    z.object({
      type: z.string().describe('file, directory, symlink, or submodule'),
      path: z.string().describe('Requested repository-relative path'),
      ref: z.string().nullable().describe('Commit SHA or ref used for the read'),
      sha: z.string().nullable().describe('Git object SHA for a single item'),
      size: z.number().nullable().describe('File size in bytes'),
      htmlUrl: z.string().nullable().describe('GitHub URL'),
      downloadUrl: z.string().nullable().describe('Provider download URL'),
      entries: z.array(contentEntrySchema).optional().describe('Directory entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let selectedRef = ctx.input.sha ?? ctx.input.ref;
    let content = await client.getContent(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.path,
      selectedRef
    );

    if (Array.isArray(content)) {
      let entries = content.map(mapContentEntry);
      return {
        output: {
          type: 'directory',
          path: ctx.input.path.replace(/^\/+/, ''),
          ref: selectedRef ?? null,
          sha: null,
          size: null,
          htmlUrl: null,
          downloadUrl: null,
          entries
        },
        message: `Found **${entries.length}** entries in **${ctx.input.owner}/${ctx.input.repo}** at \`${ctx.input.path}\`.`
      };
    }

    let hasContent = content.encoding === 'base64' && typeof content.content === 'string';
    let attachments = hasContent
      ? [
          createBase64Attachment(
            content.content.replace(/\s/g, ''),
            'application/octet-stream'
          )
        ]
      : [];

    return {
      output: {
        type: content.type ?? 'file',
        path: content.path ?? ctx.input.path.replace(/^\/+/, ''),
        ref: selectedRef ?? null,
        sha: content.sha ?? null,
        size: content.size ?? null,
        htmlUrl: content.html_url ?? null,
        downloadUrl: content.download_url ?? null
      },
      attachments,
      message:
        attachments.length > 0
          ? `Retrieved \`${content.path}\` (${content.size ?? 0} bytes) from **${ctx.input.owner}/${ctx.input.repo}**.`
          : `Retrieved metadata for \`${content.path}\` from **${ctx.input.owner}/${ctx.input.repo}**; use the download URL for content not returned by the Contents API.`
    };
  })
  .build();
