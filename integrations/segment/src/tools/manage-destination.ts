import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { segmentServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageDestination = SlateTool.create(spec, {
  name: 'Manage Destination',
  key: 'manage_destination',
  description: `Create, update, or delete a destination in your Segment workspace. Destinations are analytics tools, marketing platforms, or data warehouses where Segment routes collected data.
To create a new destination, provide the **sourceId** and **metadataId** (from the catalog). To update or delete, provide the **destinationId**.`,
  instructions: [
    'To create a destination, provide sourceId, metadataId, and optionally name/enabled/settings.',
    'To update a destination, provide destinationId along with fields to change.',
    'To delete a destination, provide destinationId and set action to "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID (required for update/delete)'),
      sourceId: z.string().optional().describe('Source ID to connect (required for create)'),
      metadataId: z
        .string()
        .optional()
        .describe('Catalog metadata ID for the destination type (required for create)'),
      name: z.string().optional().describe('Display name for the destination'),
      enabled: z.boolean().optional().describe('Whether the destination is enabled'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Destination-specific configuration settings')
    })
  )
  .output(
    z.object({
      destinationId: z.string().optional().describe('ID of the destination'),
      destinationName: z.string().optional().describe('Name of the destination'),
      sourceId: z.string().optional().describe('Connected source ID'),
      enabled: z.boolean().optional().describe('Whether the destination is enabled'),
      deleted: z.boolean().optional().describe('Whether the destination was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'create') {
      if (!ctx.input.sourceId || !ctx.input.metadataId) {
        throw segmentServiceError(
          'sourceId and metadataId are required to create a destination'
        );
      }
      let dest = await client.createDestination({
        sourceId: ctx.input.sourceId,
        metadataId: ctx.input.metadataId,
        name: ctx.input.name,
        enabled: ctx.input.enabled,
        settings: ctx.input.settings
      });
      return {
        output: {
          destinationId: dest?.id,
          destinationName: dest?.name,
          sourceId: dest?.sourceId,
          enabled: dest?.enabled
        },
        message: `Created destination **${dest?.name ?? ctx.input.metadataId}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.destinationId) {
        throw segmentServiceError('destinationId is required to update a destination');
      }
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;
      if (ctx.input.settings !== undefined) updateData.settings = ctx.input.settings;

      let dest = await client.updateDestination(ctx.input.destinationId, updateData);
      return {
        output: {
          destinationId: dest?.id,
          destinationName: dest?.name,
          sourceId: dest?.sourceId,
          enabled: dest?.enabled
        },
        message: `Updated destination **${dest?.name ?? ctx.input.destinationId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.destinationId) {
        throw segmentServiceError('destinationId is required to delete a destination');
      }
      await client.deleteDestination(ctx.input.destinationId);
      return {
        output: {
          destinationId: ctx.input.destinationId,
          deleted: true
        },
        message: `Deleted destination **${ctx.input.destinationId}**`
      };
    }

    throw segmentServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
