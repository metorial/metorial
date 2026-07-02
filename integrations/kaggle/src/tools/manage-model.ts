import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

export let manageModel = SlateTool.create(spec, {
  name: 'Manage Model',
  key: 'manage_model',
  description: `Create, update, or delete a Kaggle model. Use this tool to manage top-level model resources. For managing model variations and versions, use the "Manage Model Variation" tool instead.`,
  instructions: [
    'To create: provide ownerSlug, modelSlug, title, and set action to "create".',
    'To update: provide ownerSlug, modelSlug, and any fields to update, set action to "update".',
    'To delete: provide ownerSlug, modelSlug, and set action to "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      ownerSlug: z.string().describe('Model owner username'),
      modelSlug: z.string().describe('Model slug/name'),
      title: z.string().optional().describe('Model title (required for create)'),
      subtitle: z.string().optional().describe('Model subtitle'),
      isPrivate: z.boolean().optional().describe('Whether the model should be private'),
      description: z.string().optional().describe('Model description'),
      publishTime: z.string().optional().describe('Publish time as ISO date string'),
      provenanceSourcesSummary: z.string().optional().describe('Summary of provenance sources')
    })
  )
  .output(
    z
      .object({
        success: z.boolean().describe('Whether the operation succeeded'),
        ref: z.string().optional().describe('Reference to the model'),
        url: z.string().optional().describe('URL of the model'),
        error: z.string().optional().describe('Error message if operation failed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);

    if (ctx.input.action === 'create') {
      let result = await client.createModel({
        ownerSlug: ctx.input.ownerSlug,
        slug: ctx.input.modelSlug,
        title: ctx.input.title!,
        subtitle: ctx.input.subtitle,
        isPrivate: ctx.input.isPrivate,
        description: ctx.input.description,
        publishTime: ctx.input.publishTime,
        provenanceSourcesSummary: ctx.input.provenanceSourcesSummary
      });
      return {
        output: { success: true, ...(result ?? {}) },
        message: `Created model **${ctx.input.ownerSlug}/${ctx.input.modelSlug}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateModel(ctx.input.ownerSlug, ctx.input.modelSlug, {
        title: ctx.input.title,
        subtitle: ctx.input.subtitle,
        isPrivate: ctx.input.isPrivate,
        description: ctx.input.description,
        publishTime: ctx.input.publishTime,
        provenanceSourcesSummary: ctx.input.provenanceSourcesSummary
      });
      return {
        output: { success: true, ...(result ?? {}) },
        message: `Updated model **${ctx.input.ownerSlug}/${ctx.input.modelSlug}**.`
      };
    }

    // delete
    let result = await client.deleteModel(ctx.input.ownerSlug, ctx.input.modelSlug);
    return {
      output: { success: true, ...(result ?? {}) },
      message: `Deleted model **${ctx.input.ownerSlug}/${ctx.input.modelSlug}**.`
    };
  })
  .build();
