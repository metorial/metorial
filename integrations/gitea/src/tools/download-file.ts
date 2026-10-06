import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export const downloadFile = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download Repository File',
  description:
    'Download a repository file and return metadata including its blob SHA for subsequent edits. Use search_repos to discover the owner and repository.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      owner: z
        .string()
        .min(1)
        .describe('Owner username or organization; use search_repos to discover it'),
      repo: z.string().min(1).describe('Repository name returned by search_repos'),
      path: z.string().min(1).describe('Repository-relative file path'),
      ref: z
        .string()
        .optional()
        .describe('Branch, tag, or commit SHA; defaults to the default branch')
    })
  )
  .output(
    z.object({
      name: z.string(),
      path: z.string(),
      sha: z.string(),
      size: z.number(),
      htmlUrl: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const client = new GiteaClient(ctx.auth);
    const file = await client.getFileContent(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.path,
      ctx.input.ref
    );
    await ctx.addAttachment({
      type: 'url',
      url: client.fileDownloadUrl(ctx.input.owner, ctx.input.repo, file.path, ctx.input.ref),
      filename: file.name,
      headers: { Authorization: client.authorizationHeader }
    });
    return {
      output: {
        name: file.name,
        path: file.path,
        sha: file.sha,
        size: file.size,
        htmlUrl: file.html_url
      },
      message: `Prepared **${file.path}** for download.`
    };
  })
  .build();
