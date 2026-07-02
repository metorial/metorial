import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { segmentServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSource = SlateTool.create(spec, {
  name: 'Manage Source',
  key: 'manage_source',
  description: `Create, update, or delete a data source in your Segment workspace. Sources represent websites, mobile apps, servers, or cloud services that send data into Segment.
To create a new source, provide the **metadataId** (from the catalog) and a **slug**. To update or delete, provide the **sourceId**.`,
  instructions: [
    'To create a source, provide metadataId, slug, and optionally enabled/settings. Omit sourceId.',
    'To update a source, provide sourceId along with fields to change (name, enabled, settings).',
    'To delete a source, provide sourceId and set action to "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the source'),
      sourceId: z.string().optional().describe('Source ID (required for update/delete)'),
      metadataId: z
        .string()
        .optional()
        .describe('Catalog metadata ID for the source type (required for create)'),
      slug: z
        .string()
        .optional()
        .describe('URL-friendly name for the source (required for create)'),
      name: z.string().optional().describe('Display name for the source'),
      enabled: z.boolean().optional().describe('Whether the source is enabled'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Source-specific configuration settings')
    })
  )
  .output(
    z.object({
      sourceId: z.string().optional().describe('ID of the source'),
      sourceName: z.string().optional().describe('Name of the source'),
      sourceSlug: z.string().optional().describe('Slug of the source'),
      enabled: z.boolean().optional().describe('Whether the source is enabled'),
      writeKeys: z
        .array(z.string())
        .optional()
        .describe('Write keys associated with the source'),
      deleted: z.boolean().optional().describe('Whether the source was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'create') {
      if (!ctx.input.metadataId || !ctx.input.slug) {
        throw segmentServiceError('metadataId and slug are required to create a source');
      }
      let source = await client.createSource({
        metadataId: ctx.input.metadataId,
        slug: ctx.input.slug,
        enabled: ctx.input.enabled ?? true,
        settings: ctx.input.settings
      });
      return {
        output: {
          sourceId: source?.id,
          sourceName: source?.name,
          sourceSlug: source?.slug,
          enabled: source?.enabled,
          writeKeys: source?.writeKeys ?? []
        },
        message: `Created source **${source?.name ?? ctx.input.slug}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.sourceId) {
        throw segmentServiceError('sourceId is required to update a source');
      }
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;
      if (ctx.input.slug !== undefined) updateData.slug = ctx.input.slug;
      if (ctx.input.settings !== undefined) updateData.settings = ctx.input.settings;

      let source = await client.updateSource(ctx.input.sourceId, updateData);
      return {
        output: {
          sourceId: source?.id,
          sourceName: source?.name,
          sourceSlug: source?.slug,
          enabled: source?.enabled,
          writeKeys: source?.writeKeys ?? []
        },
        message: `Updated source **${source?.name ?? ctx.input.sourceId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.sourceId) {
        throw segmentServiceError('sourceId is required to delete a source');
      }
      await client.deleteSource(ctx.input.sourceId);
      return {
        output: {
          sourceId: ctx.input.sourceId,
          deleted: true
        },
        message: `Deleted source **${ctx.input.sourceId}**`
      };
    }

    throw segmentServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
