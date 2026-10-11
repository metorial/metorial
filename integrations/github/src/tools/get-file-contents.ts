import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
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

    let filePath: string = content.path ?? ctx.input.path.replace(/^\/+/, '');
    let hasContent = content.encoding === 'base64' && typeof content.content === 'string';
    let attached = false;
    if (hasContent) {
      await ctx.addAttachment({
        type: 'content',
        content: Uint8Array.from(Buffer.from(content.content.replace(/\s/g, ''), 'base64')),
        mimeType: 'application/octet-stream'
      });
      attached = true;
    } else if (
      content.type === 'file' &&
      (typeof content.size !== 'number' || content.size <= 100 * 1024 * 1024)
    ) {
      // Files between 1 MB and 100 MB come back without inline content; the raw media type
      // serves them directly: https://docs.github.com/en/rest/repos/contents#get-repository-content
      await ctx.addAttachment({
        type: 'url',
        url: `${client.getApiBaseUrl()}/repos/${encodeURIComponent(ctx.input.owner)}/${encodeURIComponent(ctx.input.repo)}/contents/${filePath
          .split('/')
          .map(segment => encodeURIComponent(segment))
          .join('/')}`,
        mimeType: 'application/octet-stream',
        headers: {
          Authorization: `Bearer ${ctx.auth.token}`,
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        ...(selectedRef ? { query: { ref: selectedRef } } : {})
      });
      attached = true;
    }

    return {
      output: {
        type: content.type ?? 'file',
        path: filePath,
        ref: selectedRef ?? null,
        sha: content.sha ?? null,
        size: content.size ?? null,
        htmlUrl: content.html_url ?? null,
        downloadUrl: content.download_url ?? null
      },
      message: attached
        ? `Retrieved \`${filePath}\` (${content.size ?? 0} bytes) from **${ctx.input.owner}/${ctx.input.repo}** as a downloadable file.`
        : `Retrieved metadata for \`${filePath}\` from **${ctx.input.owner}/${ctx.input.repo}**; this entry has no downloadable file content.`
    };
  })
  .build();
