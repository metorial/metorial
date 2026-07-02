import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let manageTransformation = SlateTool.create(spec, {
  name: 'Manage Transformation',
  key: 'manage_transformation',
  description: `Create, update, list, or delete event transformations. Transformations modify events in-flight (rename events, rename properties, add computed properties) before they reach destinations.`,
  instructions: [
    'To create, provide name, sourceId, and at least one of: newEventName, propertyRenames, fqlDefinedProperties.',
    'To update, provide transformationId and fields to change.',
    'To delete, set action to "delete" with transformationId.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'list']).describe('Operation to perform'),
      transformationId: z
        .string()
        .optional()
        .describe('Transformation ID (required for update/delete)'),
      name: z.string().optional().describe('Transformation name'),
      sourceId: z.string().optional().describe('Source ID (required for create)'),
      destinationMetadataId: z
        .string()
        .optional()
        .describe('Limit to a specific destination type'),
      condition: z
        .string()
        .optional()
        .describe('FQL condition for when the transformation applies'),
      newEventName: z.string().optional().describe('Rename the event to this name'),
      propertyRenames: z
        .array(
          z.object({
            oldName: z.string().describe('Original property name'),
            newName: z.string().describe('New property name')
          })
        )
        .optional()
        .describe('Property rename mappings'),
      fqlDefinedProperties: z
        .array(
          z.object({
            fql: z.string().describe('FQL expression'),
            propertyName: z.string().describe('Target property name')
          })
        )
        .optional()
        .describe('Computed properties using FQL'),
      enabled: z.boolean().optional().describe('Whether enabled')
    })
  )
  .output(
    z.object({
      transformationId: z.string().optional().describe('Transformation ID'),
      transformationName: z.string().optional().describe('Name'),
      enabled: z.boolean().optional().describe('Whether enabled'),
      deleted: z.boolean().optional().describe('Whether deleted'),
      transformations: z
        .array(
          z.object({
            transformationId: z.string().describe('ID'),
            transformationName: z.string().optional().describe('Name'),
            sourceId: z.string().optional().describe('Source ID'),
            enabled: z.boolean().optional().describe('Enabled')
          })
        )
        .optional()
        .describe('List of transformations (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'list') {
      let result = await client.listTransformations();
      let transformations = (result?.transformations ?? []).map((t: any) => ({
        transformationId: t.id,
        transformationName: t.name,
        sourceId: t.sourceId,
        enabled: t.enabled
      }));
      return {
        output: { transformations },
        message: `Found **${transformations.length}** transformations`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.sourceId) {
        throw new Error('name and sourceId are required to create a transformation');
      }
      let t = await client.createTransformation({
        name: ctx.input.name,
        sourceId: ctx.input.sourceId,
        destinationMetadataId: ctx.input.destinationMetadataId,
        if: ctx.input.condition,
        newEventName: ctx.input.newEventName,
        propertyRenames: ctx.input.propertyRenames,
        fqlDefinedProperties: ctx.input.fqlDefinedProperties,
        enabled: ctx.input.enabled
      });
      return {
        output: {
          transformationId: t?.id,
          transformationName: t?.name,
          enabled: t?.enabled
        },
        message: `Created transformation **${t?.name ?? ctx.input.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.transformationId) {
        throw new Error('transformationId is required to update');
      }
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.condition !== undefined) updateData.if = ctx.input.condition;
      if (ctx.input.newEventName !== undefined)
        updateData.newEventName = ctx.input.newEventName;
      if (ctx.input.propertyRenames !== undefined)
        updateData.propertyRenames = ctx.input.propertyRenames;
      if (ctx.input.fqlDefinedProperties !== undefined)
        updateData.fqlDefinedProperties = ctx.input.fqlDefinedProperties;
      if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;

      let t = await client.updateTransformation(ctx.input.transformationId, updateData);
      return {
        output: {
          transformationId: t?.id,
          transformationName: t?.name,
          enabled: t?.enabled
        },
        message: `Updated transformation **${t?.name ?? ctx.input.transformationId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.transformationId) {
        throw new Error('transformationId is required to delete');
      }
      await client.deleteTransformation(ctx.input.transformationId);
      return {
        output: { transformationId: ctx.input.transformationId, deleted: true },
        message: `Deleted transformation \`${ctx.input.transformationId}\``
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
