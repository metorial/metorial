import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let createRelease = SlateTool.create(spec, {
  name: 'Create Release',
  key: 'create_release',
  description: `Create a new release for a GitHub repository with a tag, name, release notes, and draft/pre-release options.
Can automatically generate release notes from commits since the last release.`
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      tagName: z.string().describe('Tag name for the release (e.g., "v1.0.0")'),
      targetCommitish: z
        .string()
        .optional()
        .describe('Branch or commit SHA for the tag (defaults to default branch)'),
      name: z.string().optional().describe('Release title'),
      body: z.string().optional().describe('Release notes in Markdown'),
      draft: z.boolean().optional().describe('Create as a draft release'),
      prerelease: z.boolean().optional().describe('Mark as a pre-release'),
      generateReleaseNotes: z
        .boolean()
        .optional()
        .describe('Auto-generate release notes from commits')
    })
  )
  .output(
    z.object({
      releaseId: z.number().describe('Release ID'),
      tagName: z.string().describe('Tag name'),
      name: z.string().nullable().describe('Release title'),
      htmlUrl: z.string().describe('URL to the release on GitHub'),
      draft: z.boolean().describe('Whether this is a draft'),
      prerelease: z.boolean().describe('Whether this is a pre-release'),
      createdAt: z.string().describe('Creation timestamp'),
      publishedAt: z.string().nullable().describe('Publication timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let release = await client.createRelease(ctx.input.owner, ctx.input.repo, {
      tagName: ctx.input.tagName,
      targetCommitish: ctx.input.targetCommitish,
      name: ctx.input.name,
      body: ctx.input.body,
      draft: ctx.input.draft,
      prerelease: ctx.input.prerelease,
      generateReleaseNotes: ctx.input.generateReleaseNotes
    });

    return {
      output: {
        releaseId: release.id,
        tagName: release.tag_name,
        name: release.name,
        htmlUrl: release.html_url,
        draft: release.draft,
        prerelease: release.prerelease,
        createdAt: release.created_at,
        publishedAt: release.published_at
      },
      message: `Created release **${release.tag_name}**${release.name ? ` "${release.name}"` : ''} in **${ctx.input.owner}/${ctx.input.repo}** — ${release.html_url}`
    };
  })
  .build();
