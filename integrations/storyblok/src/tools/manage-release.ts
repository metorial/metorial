import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let manageRelease = SlateTool.create(spec, {
  name: 'Manage Release',
  key: 'manage_release',
  description: `Create, delete, merge, or list content releases. Releases group content changes that can be published together as a batch.`,
  instructions: [
    'To **create** a release, set action to "create" and provide a name.',
    'To **merge** (publish) a release, set action to "merge" and provide the releaseId.',
    'To **delete** a release, set action to "delete" and provide the releaseId.',
    'To **list** all releases, set action to "list".'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'merge', 'list'])
        .describe('The release action to perform'),
      releaseId: z.string().optional().describe('Release ID (required for merge, delete)'),
      name: z.string().optional().describe('Release name (required for create)'),
      releaseAt: z
        .string()
        .optional()
        .describe('Scheduled release date/time in ISO 8601 format'),
      timezone: z.string().optional().describe('Timezone for the scheduled release')
    })
  )
  .output(
    z.object({
      releaseId: z.number().optional().describe('ID of the affected release'),
      name: z.string().optional().describe('Name of the release'),
      released: z.boolean().optional().describe('Whether the release has been merged'),
      releaseAt: z.string().optional().describe('Scheduled release date'),
      releases: z
        .array(
          z.object({
            releaseId: z.number().optional(),
            name: z.string().optional(),
            released: z.boolean().optional(),
            releaseAt: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of releases (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let { action, releaseId } = ctx.input;

    if (action === 'list') {
      let releases = await client.listReleases();
      return {
        output: {
          releases: releases.map(r => ({
            releaseId: r.id,
            name: r.name,
            released: r.released,
            releaseAt: r.release_at,
            createdAt: r.created_at
          }))
        },
        message: `Found **${releases.length}** releases.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a release');
      let release = await client.createRelease({
        name: ctx.input.name,
        releaseAt: ctx.input.releaseAt,
        timezone: ctx.input.timezone
      });
      return {
        output: {
          releaseId: release.id,
          name: release.name,
          released: release.released,
          releaseAt: release.release_at
        },
        message: `Created release **${release.name}** (\`${release.id}\`).`
      };
    }

    if (!releaseId) throw new Error('releaseId is required for this action');

    if (action === 'merge') {
      await client.mergeRelease(releaseId);
      return {
        output: { releaseId: Number.parseInt(releaseId, 10), released: true },
        message: `Merged release \`${releaseId}\`.`
      };
    }

    // action === 'delete'
    await client.deleteRelease(releaseId);
    return {
      output: { releaseId: Number.parseInt(releaseId, 10) },
      message: `Deleted release \`${releaseId}\`.`
    };
  })
  .build();
