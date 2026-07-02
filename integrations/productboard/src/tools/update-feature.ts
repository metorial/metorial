import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateFeatureTool = SlateTool.create(spec, {
  name: 'Update Feature',
  key: 'update_feature',
  description: `Update an existing feature's properties. You can change name, description, status, parent hierarchy, assignee, and timeframe. Only provided fields are updated.`
})
  .input(
    z.object({
      featureId: z.string().describe('The ID of the feature to update'),
      name: z.string().optional().describe('New name for the feature'),
      description: z.string().optional().describe('New HTML description'),
      statusId: z.string().optional().describe('ID of the feature status to set'),
      parentFeatureId: z
        .string()
        .optional()
        .describe('ID of the parent feature to move under'),
      parentComponentId: z
        .string()
        .optional()
        .describe('ID of the parent component to move under'),
      parentProductId: z
        .string()
        .optional()
        .describe('ID of the parent product to move under'),
      assigneeEmail: z.string().optional().describe('Email of the workspace member to assign'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      feature: z.record(z.string(), z.any()).describe('The updated feature')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let parent: any;
    if (ctx.input.parentFeatureId) {
      parent = { feature: { id: ctx.input.parentFeatureId } };
    } else if (ctx.input.parentComponentId) {
      parent = { component: { id: ctx.input.parentComponentId } };
    } else if (ctx.input.parentProductId) {
      parent = { product: { id: ctx.input.parentProductId } };
    }

    let timeframe: any;
    if (ctx.input.startDate !== undefined || ctx.input.endDate !== undefined) {
      timeframe = {};
      if (ctx.input.startDate !== undefined) timeframe.startDate = ctx.input.startDate;
      if (ctx.input.endDate !== undefined) timeframe.endDate = ctx.input.endDate;
    }

    let feature = await client.updateFeature(ctx.input.featureId, {
      name: ctx.input.name,
      description: ctx.input.description,
      status: ctx.input.statusId ? { id: ctx.input.statusId } : undefined,
      parent,
      timeframe,
      assignee: ctx.input.assigneeEmail ? { email: ctx.input.assigneeEmail } : undefined
    });

    return {
      output: { feature },
      message: `Updated feature **${feature.name || ctx.input.featureId}**.`
    };
  })
  .build();
