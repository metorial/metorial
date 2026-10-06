import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, releaseEntityCount } from '../lib/helpers';
import {
  currentVersion,
  invalid,
  limitSchema,
  pageOutput,
  resourceId,
  selection,
  versionSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let manageRelease = SlateTool.create(spec, {
  name: 'Manage Release',
  key: 'manage_release',
  description: `Manage Release.v1 groups of entries and assets. Publish and unpublish return asynchronous action receipts; get with releaseActionId reads their status.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ...selection,
      limit: limitSchema,
      nextPage: z
        .string()
        .optional()
        .describe('Native next-page URL from a previous release list.'),
      releaseActionId: resourceId
        .optional()
        .describe(
          'With get, inspect the exact asynchronous action returned by publish or unpublish.'
        ),
      action: z
        .enum(['list', 'get', 'create', 'publish', 'unpublish', 'delete'])
        .describe('Action to perform on releases.'),
      releaseId: resourceId
        .optional()
        .describe('Release ID. Required for get, publish, unpublish, and delete.'),
      title: z.string().optional().describe('Release title. Required for create.'),
      description: z
        .string()
        .optional()
        .describe(
          'Legacy field; current Release.v1 creation does not document it. Omit it; a supplied value is refused before creation.'
        ),
      entities: z
        .array(
          z.object({
            entityId: resourceId.describe('Entity ID.'),
            entityType: z.enum(['Entry', 'Asset']).describe('Type of entity.')
          })
        )
        .optional()
        .describe('Entities to include in the release. Required for create.'),
      version: versionSchema
        .optional()
        .describe(
          'Current release version. Required for publish/unpublish (fetched automatically if omitted).'
        )
    })
  )
  .output(
    z.object({
      ...pageOutput,
      nextPage: z.string().optional(),
      releaseActionId: resourceId.optional(),
      status: z
        .string()
        .optional()
        .describe('Native asynchronous action status; acceptance does not mean completion.'),
      failed: z.boolean().optional(),
      action: z.string().describe('Action performed.'),
      releaseId: resourceId.optional().describe('Release ID.'),
      title: z.string().optional().describe('Release title.'),
      releases: z
        .array(
          z.object({
            releaseId: resourceId.describe('Release ID.'),
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
    let client = createClient(ctx.config, ctx.auth, ctx.input);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.getReleases({
          limit: ctx.input.limit,
          nextPage: ctx.input.nextPage
        });
        let releases = result.items.map((r: any) => ({
          releaseId: r.sys?.id,
          title: r.title,
          description: r.description,
          entityCount: releaseEntityCount(r.entities),
          createdAt: r.sys?.createdAt
        }));
        return {
          output: {
            action: 'list',
            limit: result.limit,
            nextPage: result.nextPage,
            hasMore: result.hasMore,
            releases
          },
          message: `Found **${releases.length}** releases.`
        };
      }
      case 'get': {
        if (!ctx.input.releaseId) throw invalid('releaseId is required');
        if (ctx.input.releaseActionId) {
          let receipt = await client.getReleaseAction(
            ctx.input.releaseId,
            ctx.input.releaseActionId
          );
          return {
            output: {
              action: 'get',
              releaseId: ctx.input.releaseId,
              releaseActionId: receipt.sys.id,
              status: typeof receipt.sys.status === 'string' ? receipt.sys.status : undefined,
              failed: receipt.sys.status === 'failed'
            },
            message: 'Retrieved the release action status.'
          };
        }
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
          throw invalid('title and entities are required for creating a release');
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
        if (!ctx.input.releaseId) throw invalid('releaseId is required');
        let version = ctx.input.version;
        if (version === undefined) {
          let current = await client.getRelease(ctx.input.releaseId);
          version = currentVersion(current);
        }
        let receipt = await client.publishRelease(ctx.input.releaseId, version!);
        return {
          output: {
            action: 'publish',
            releaseId: ctx.input.releaseId,
            releaseActionId: receipt.sys.id,
            status: typeof receipt.sys.status === 'string' ? receipt.sys.status : undefined
          },
          message: `Accepted release publish action; inspect releaseActionId before treating it as complete.`
        };
      }
      case 'unpublish': {
        if (!ctx.input.releaseId) throw invalid('releaseId is required');
        let version = ctx.input.version;
        if (version === undefined) {
          let current = await client.getRelease(ctx.input.releaseId);
          version = currentVersion(current);
        }
        let receipt = await client.unpublishRelease(ctx.input.releaseId, version!);
        return {
          output: {
            action: 'unpublish',
            releaseId: ctx.input.releaseId,
            releaseActionId: receipt.sys.id,
            status: typeof receipt.sys.status === 'string' ? receipt.sys.status : undefined
          },
          message: `Accepted release unpublish action; inspect releaseActionId before treating it as complete.`
        };
      }
      case 'delete': {
        if (!ctx.input.releaseId) throw invalid('releaseId is required');
        await client.deleteRelease(ctx.input.releaseId);
        return {
          output: { action: 'delete', releaseId: ctx.input.releaseId },
          message: `Deleted release **${ctx.input.releaseId}**.`
        };
      }
    }
  })
  .build();
