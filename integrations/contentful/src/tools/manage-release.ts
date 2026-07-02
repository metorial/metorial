import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRelease = SlateTool.create(spec, {
  name: 'Manage Release',
  key: 'manage_release',
  description: `Create, list, publish, unpublish, or delete releases. A release groups multiple entries and assets for bulk publishing.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'publish', 'unpublish', 'delete'])
        .describe('Action to perform on releases.'),
      releaseId: z
        .string()
        .optional()
        .describe('Release ID. Required for get, publish, unpublish, and delete.'),
      title: z.string().optional().describe('Release title. Required for create.'),
      description: z.string().optional().describe('Release description. Used for create.'),
      entities: z
        .array(
          z.object({
            entityId: z.string().describe('Entity ID.'),
            entityType: z.enum(['Entry', 'Asset']).describe('Type of entity.')
          })
        )
        .optional()
        .describe('Entities to include in the release. Required for create.'),
      version: z
        .number()
        .optional()
        .describe(
          'Current release version. Required for publish/unpublish (fetched automatically if omitted).'
        )
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed.'),
      releaseId: z.string().optional().describe('Release ID.'),
      title: z.string().optional().describe('Release title.'),
      releases: z
        .array(
          z.object({
            releaseId: z.string().describe('Release ID.'),
            title: z.string().describe('Release title.'),
            description: z.string().optional().describe('Release description.'),
            entityCount: z.number().optional().describe('Number of entities in the release.'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp.')
          })
        )
        .optional()
        .describe('List of releases (only for list action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.getReleases();
        let releases = (result.items || []).map((r: any) => ({
          releaseId: r.sys?.id,
          title: r.title,
          description: r.description,
          entityCount: r.entities?.length,
          createdAt: r.sys?.createdAt
        }));
        return {
          output: { action: 'list', releases },
          message: `Found **${releases.length}** releases.`
        };
      }
      case 'get': {
        if (!ctx.input.releaseId) throw new Error('releaseId is required');
        let release = await client.getRelease(ctx.input.releaseId);
        return {
          output: {
            action: 'get',
            releaseId: release.sys?.id,
            title: release.title
          },
          message: `Retrieved release **${release.title}**.`
        };
      }
      case 'create': {
        if (!ctx.input.title || !ctx.input.entities) {
          throw new Error('title and entities are required for creating a release');
        }
        let entities = ctx.input.entities.map(e => ({
          sys: { linkType: e.entityType, type: 'Link', id: e.entityId }
        }));
        let created = await client.createRelease({
          title: ctx.input.title,
          description: ctx.input.description,
          entities
        });
        return {
          output: { action: 'create', releaseId: created.sys?.id, title: created.title },
          message: `Created release **${created.title}** with ${ctx.input.entities.length} entities.`
        };
      }
      case 'publish': {
        if (!ctx.input.releaseId) throw new Error('releaseId is required');
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getRelease(ctx.input.releaseId);
          version = current.sys.version;
        }
        await client.publishRelease(ctx.input.releaseId, version!);
        return {
          output: { action: 'publish', releaseId: ctx.input.releaseId },
          message: `Published release **${ctx.input.releaseId}**.`
        };
      }
      case 'unpublish': {
        if (!ctx.input.releaseId) throw new Error('releaseId is required');
        let version = ctx.input.version;
        if (!version) {
          let current = await client.getRelease(ctx.input.releaseId);
          version = current.sys.version;
        }
        await client.unpublishRelease(ctx.input.releaseId, version!);
        return {
          output: { action: 'unpublish', releaseId: ctx.input.releaseId },
          message: `Unpublished release **${ctx.input.releaseId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.releaseId) throw new Error('releaseId is required');
        await client.deleteRelease(ctx.input.releaseId);
        return {
          output: { action: 'delete', releaseId: ctx.input.releaseId },
          message: `Deleted release **${ctx.input.releaseId}**.`
        };
      }
    }
  })
  .build();
