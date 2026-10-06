import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { branches, resolveSpace, spaceIdInput } from '../lib/validation';
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
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      spaceId: spaceIdInput,
      action: z
        .enum(['create', 'delete', 'merge', 'list', 'get'])
        .describe('The release action to perform'),
      releaseId: z.string().optional().describe('Release ID (required for merge, delete)'),
      name: z.string().optional().describe('Release name (required for create)'),
      releaseAt: z
        .string()
        .optional()
        .describe(
          'Native wall-clock date/time YYYY-MM-DD HH:mm; requires explicit IANA timezone'
        ),
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
    branches(
      ctx.input,
      {
        create: ['name', 'releaseAt', 'timezone'],
        delete: ['releaseId'],
        merge: ['releaseId'],
        list: [],
        get: ['releaseId']
      }[ctx.input.action]
    );
    let client = new StoryblokClient({
      ...ctx.auth,
      spaceId: resolveSpace(
        ctx.input.spaceId,
        ctx.config.spaceId,
        ctx.auth.mode === 'oauth' ? ctx.auth.spaceId : undefined
      )
    });

    let { action, releaseId } = ctx.input;

    if (action === 'list') {
      let result = await client.listReleases();
      return {
        output: {
          releases: result.releases.map(r => ({
            releaseId: r.id,
            name: r.name,
            released: r.released,
            releaseAt: r.release_at,
            createdAt: r.created_at
          }))
        },
        message: `Found **${result.releases.length}** releases.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('Name is required to create a release');
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

    if (!releaseId) throw createApiServiceError('releaseId is required for this action');

    if (action === 'merge') {
      let release = await client.mergeRelease(releaseId);
      return {
        output: {
          releaseId: release.id,
          name: release.name,
          released: release.released,
          releaseAt: release.release_at
        },
        message: `Merged release \`${releaseId}\`.`
      };
    }

    if (action === 'get') {
      const release = await client.getRelease(releaseId);
      return {
        output: {
          releaseId: release.id,
          name: release.name,
          released: release.released,
          releaseAt: release.release_at
        },
        message: 'Retrieved the exact release.'
      };
    }

    // action === 'delete'
    await client.deleteRelease(releaseId);
    return {
      output: { releaseId: Number(releaseId) },
      message: `Deleted release \`${releaseId}\`.`
    };
  })
  .build();
