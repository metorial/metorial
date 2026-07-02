import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createRelease = SlateTool.create(spec, {
  name: 'Create Release',
  key: 'create_release',
  description: `Create a new release for a project, or list existing releases. Releases are associated with a Git tag and can include release notes and milestone associations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list'])
        .describe('Create a new release or list existing ones'),
      projectId: z.string().describe('Project ID or URL-encoded path'),
      tagName: z.string().optional().describe('Git tag for the release (required for create)'),
      name: z.string().optional().describe('Release title'),
      description: z.string().optional().describe('Release notes (Markdown supported)'),
      ref: z.string().optional().describe("If the tag doesn't exist, create it from this ref"),
      milestones: z.array(z.string()).optional().describe('Milestone titles to associate'),
      releasedAt: z.string().optional().describe('Release date (ISO 8601 format)'),
      perPage: z.number().optional().describe('Results per page (list only)'),
      page: z.number().optional().describe('Page number (list only)')
    })
  )
  .output(
    z.object({
      release: z
        .object({
          tagName: z.string().describe('Git tag name'),
          name: z.string().describe('Release title'),
          description: z.string().nullable().describe('Release notes'),
          createdAt: z.string().describe('Creation timestamp'),
          releasedAt: z.string().describe('Release date'),
          authorUsername: z.string().nullable().describe('Author username')
        })
        .optional()
        .describe('Created release'),
      releases: z
        .array(
          z.object({
            tagName: z.string().describe('Git tag name'),
            name: z.string().describe('Release title'),
            description: z.string().nullable().describe('Release notes'),
            createdAt: z.string().describe('Creation timestamp'),
            releasedAt: z.string().describe('Release date'),
            authorUsername: z.string().nullable().describe('Author username')
          })
        )
        .optional()
        .describe('List of releases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'list') {
      let releases = await client.listReleases(ctx.input.projectId, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });

      let mapped = releases.map((r: any) => ({
        tagName: r.tag_name,
        name: r.name,
        description: r.description || null,
        createdAt: r.created_at,
        releasedAt: r.released_at,
        authorUsername: r.author?.username || null
      }));

      return {
        output: { releases: mapped },
        message: `Found **${mapped.length}** releases`
      };
    }

    if (!ctx.input.tagName) throw gitLabServiceError('Tag name is required for create');
    let release = await client.createRelease(ctx.input.projectId, {
      tagName: ctx.input.tagName,
      name: ctx.input.name,
      description: ctx.input.description,
      ref: ctx.input.ref,
      milestones: ctx.input.milestones,
      releasedAt: ctx.input.releasedAt
    });

    return {
      output: {
        release: {
          tagName: release.tag_name,
          name: release.name,
          description: release.description || null,
          createdAt: release.created_at,
          releasedAt: release.released_at,
          authorUsername: release.author?.username || null
        }
      },
      message: `Created release **${release.name || release.tag_name}** for tag \`${release.tag_name}\``
    };
  })
  .build();
