import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createFeatureTool = SlateTool.create(spec, {
  name: 'Create Feature',
  key: 'create_feature',
  description: `Create a new feature in the product hierarchy. Features can be nested under products, components, or other features. You can set a status, assignee, timeframe, and description.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the feature'),
      description: z.string().optional().describe('HTML description of the feature'),
      statusId: z.string().optional().describe('ID of the feature status to set'),
      parentFeatureId: z
        .string()
        .optional()
        .describe('ID of the parent feature (for subfeatures)'),
      parentComponentId: z.string().optional().describe('ID of the parent component'),
      parentProductId: z.string().optional().describe('ID of the parent product'),
      assigneeEmail: z.string().optional().describe('Email of the workspace member to assign'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      feature: z.record(z.string(), z.any()).describe('The created feature')
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
    if (ctx.input.startDate || ctx.input.endDate) {
      timeframe = {};
      if (ctx.input.startDate) timeframe.startDate = ctx.input.startDate;
      if (ctx.input.endDate) timeframe.endDate = ctx.input.endDate;
    }

    let feature = await client.createFeature({
      name: ctx.input.name,
      description: ctx.input.description,
      status: ctx.input.statusId ? { id: ctx.input.statusId } : undefined,
      parent,
      timeframe,
      assignee: ctx.input.assigneeEmail ? { email: ctx.input.assigneeEmail } : undefined
    });

    return {
      output: { feature },
      message: `Created feature **${feature.name}**.`
    };
  })
  .build();
