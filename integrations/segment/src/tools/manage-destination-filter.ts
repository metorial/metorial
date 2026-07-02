import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let manageDestinationFilter = SlateTool.create(spec, {
  name: 'Manage Destination Filter',
  key: 'manage_destination_filter',
  description: `Create, update, or remove filters on a destination. Destination filters control which events are forwarded, allowing you to drop events, sample a percentage, or strip specific properties before delivery.`,
  instructions: [
    'To create a filter, provide destinationId, sourceId, title, a FQL condition string, and actions.',
    'Filter actions include: "drop" (block event), "sample" (percentage sampling), "allow_properties", "drop_properties".',
    'To update, provide destinationId and filterId along with fields to change.',
    'To remove, set action to "remove" with destinationId and filterId.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove', 'list']).describe('Operation to perform'),
      destinationId: z.string().describe('Destination ID'),
      filterId: z.string().optional().describe('Filter ID (required for update/remove)'),
      sourceId: z.string().optional().describe('Source ID (required for create)'),
      title: z.string().optional().describe('Filter title'),
      description: z.string().optional().describe('Filter description'),
      condition: z
        .string()
        .optional()
        .describe('FQL condition string (e.g. \'type = "track"\')'),
      filterActions: z
        .array(
          z.object({
            type: z
              .string()
              .describe('Action type: drop, sample, allow_properties, drop_properties'),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe(
                'Action-specific fields (e.g. percent for sample, fields for property actions)'
              )
          })
        )
        .optional()
        .describe('Filter actions to apply when the condition matches'),
      enabled: z.boolean().optional().describe('Whether the filter is enabled')
    })
  )
  .output(
    z.object({
      filterId: z.string().optional().describe('Filter ID'),
      title: z.string().optional().describe('Filter title'),
      enabled: z.boolean().optional().describe('Whether enabled'),
      filters: z
        .array(
          z.object({
            filterId: z.string().describe('Filter ID'),
            title: z.string().optional().describe('Title'),
            enabled: z.boolean().optional().describe('Enabled')
          })
        )
        .optional()
        .describe('List of filters (for list action)'),
      removed: z.boolean().optional().describe('Whether the filter was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'list') {
      let result = await client.listDestinationFilters(ctx.input.destinationId);
      let filters = (result?.filters ?? []).map((f: any) => ({
        filterId: f.id,
        title: f.title,
        enabled: f.enabled
      }));
      return {
        output: { filters },
        message: `Found **${filters.length}** filters on destination \`${ctx.input.destinationId}\``
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.sourceId ||
        !ctx.input.title ||
        !ctx.input.condition ||
        !ctx.input.filterActions
      ) {
        throw new Error(
          'sourceId, title, condition, and filterActions are required to create a filter'
        );
      }
      let filter = await client.createDestinationFilter(ctx.input.destinationId, {
        sourceId: ctx.input.sourceId,
        title: ctx.input.title,
        description: ctx.input.description,
        if: ctx.input.condition,
        actions: ctx.input.filterActions,
        enabled: ctx.input.enabled
      });
      return {
        output: {
          filterId: filter?.id,
          title: filter?.title,
          enabled: filter?.enabled
        },
        message: `Created filter **${filter?.title ?? ctx.input.title}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.filterId) {
        throw new Error('filterId is required to update a filter');
      }
      let updateData: Record<string, any> = {};
      if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.condition !== undefined) updateData.if = ctx.input.condition;
      if (ctx.input.filterActions !== undefined) updateData.actions = ctx.input.filterActions;
      if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;

      let filter = await client.updateDestinationFilter(
        ctx.input.destinationId,
        ctx.input.filterId,
        updateData
      );
      return {
        output: {
          filterId: filter?.id,
          title: filter?.title,
          enabled: filter?.enabled
        },
        message: `Updated filter **${filter?.title ?? ctx.input.filterId}**`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.filterId) {
        throw new Error('filterId is required to remove a filter');
      }
      await client.removeDestinationFilter(ctx.input.destinationId, ctx.input.filterId);
      return {
        output: {
          filterId: ctx.input.filterId,
          removed: true
        },
        message: `Removed filter \`${ctx.input.filterId}\``
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
