import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let releaseOutputSchema = z.object({
  releaseId: z.number().describe('Release ID'),
  tagName: z.string().describe('Git tag name'),
  name: z.string().describe('Release title'),
  body: z.string().describe('Release notes'),
  isDraft: z.boolean().describe('Whether the release is a draft'),
  isPrerelease: z.boolean().describe('Whether it is a pre-release'),
  htmlUrl: z.string().describe('Web URL of the release'),
  authorLogin: z.string().describe('Username of the release author'),
  targetCommitish: z.string().describe('Target branch or commit'),
  assets: z
    .array(
      z.object({
        assetId: z.number().describe('Asset ID'),
        name: z.string().describe('Asset file name'),
        size: z.number().describe('Asset size in bytes'),
        downloadCount: z.number().describe('Number of downloads'),
        downloadUrl: z.string().describe('Download URL')
      })
    )
    .describe('Release assets'),
  createdAt: z.string().describe('Creation timestamp'),
  publishedAt: z.string().describe('Publication timestamp')
});

export let listReleases = SlateTool.create(spec, {
  name: 'List Releases',
  key: 'list_releases',
  description: `List releases in a repository including draft and pre-release versions, their assets, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      releases: z.array(releaseOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let releases = await client.listReleases(ctx.input.owner, ctx.input.repo, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let mapped = releases.map(r => ({
      releaseId: r.id,
      tagName: r.tag_name,
      name: r.name || '',
      body: r.body || '',
      isDraft: r.draft,
      isPrerelease: r.prerelease,
      htmlUrl: r.html_url,
      authorLogin: r.author.login,
      targetCommitish: r.target_commitish,
      assets: (r.assets || []).map(a => ({
        assetId: a.id,
        name: a.name,
        size: a.size,
        downloadCount: a.download_count,
        downloadUrl: a.browser_download_url
      })),
      createdAt: r.created_at,
      publishedAt: r.published_at
    }));

    return {
      output: { releases: mapped },
      message: `Found **${mapped.length}** releases in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let createRelease = SlateTool.create(spec, {
  name: 'Create Release',
  key: 'create_release',
  description: `Create a new release for a repository. Can create a new tag or use an existing one. Supports draft and pre-release flags.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      tagName: z
        .string()
        .describe('Git tag name for the release (will be created if it does not exist)'),
      name: z.string().optional().describe('Release title'),
      body: z.string().optional().describe('Release notes (supports Markdown)'),
      targetCommitish: z
        .string()
        .optional()
        .describe('Branch or commit SHA to tag; defaults to the default branch'),
      isDraft: z.boolean().optional().describe('Create as a draft release'),
      isPrerelease: z.boolean().optional().describe('Mark as a pre-release')
    })
  )
  .output(releaseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let r = await client.createRelease(ctx.input.owner, ctx.input.repo, {
      tagName: ctx.input.tagName,
      name: ctx.input.name,
      body: ctx.input.body,
      targetCommitish: ctx.input.targetCommitish,
      draft: ctx.input.isDraft,
      prerelease: ctx.input.isPrerelease
    });

    return {
      output: {
        releaseId: r.id,
        tagName: r.tag_name,
        name: r.name || '',
        body: r.body || '',
        isDraft: r.draft,
        isPrerelease: r.prerelease,
        htmlUrl: r.html_url,
        authorLogin: r.author.login,
        targetCommitish: r.target_commitish,
        assets: (r.assets || []).map(a => ({
          assetId: a.id,
          name: a.name,
          size: a.size,
          downloadCount: a.download_count,
          downloadUrl: a.browser_download_url
        })),
        createdAt: r.created_at,
        publishedAt: r.published_at
      },
      message: `Created release **${r.name || r.tag_name}** (tag: ${r.tag_name})`
    };
  })
  .build();

export let updateRelease = SlateTool.create(spec, {
  name: 'Update Release',
  key: 'update_release',
  description: `Update an existing release's title, notes, tag, or draft/pre-release status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      releaseId: z.number().describe('Release ID to update'),
      tagName: z.string().optional().describe('New tag name'),
      name: z.string().optional().describe('New release title'),
      body: z.string().optional().describe('New release notes'),
      isDraft: z.boolean().optional().describe('Set draft status'),
      isPrerelease: z.boolean().optional().describe('Set pre-release status')
    })
  )
  .output(releaseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let r = await client.updateRelease(ctx.input.owner, ctx.input.repo, ctx.input.releaseId, {
      tagName: ctx.input.tagName,
      name: ctx.input.name,
      body: ctx.input.body,
      draft: ctx.input.isDraft,
      prerelease: ctx.input.isPrerelease
    });

    return {
      output: {
        releaseId: r.id,
        tagName: r.tag_name,
        name: r.name || '',
        body: r.body || '',
        isDraft: r.draft,
        isPrerelease: r.prerelease,
        htmlUrl: r.html_url,
        authorLogin: r.author.login,
        targetCommitish: r.target_commitish,
        assets: (r.assets || []).map(a => ({
          assetId: a.id,
          name: a.name,
          size: a.size,
          downloadCount: a.download_count,
          downloadUrl: a.browser_download_url
        })),
        createdAt: r.created_at,
        publishedAt: r.published_at
      },
      message: `Updated release **${r.name || r.tag_name}**`
    };
  })
  .build();

export let deleteRelease = SlateTool.create(spec, {
  name: 'Delete Release',
  key: 'delete_release',
  description: `Delete a release from a repository. This does not delete the associated Git tag.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      releaseId: z.number().describe('Release ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the release was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    await client.deleteRelease(ctx.input.owner, ctx.input.repo, ctx.input.releaseId);

    return {
      output: { deleted: true },
      message: `Deleted release **#${ctx.input.releaseId}**`
    };
  })
  .build();
