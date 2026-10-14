import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let manageContentModel = SlateTool.create(spec, {
  name: 'Manage Content Model',
  key: 'manage_content_model',
  description: `Creates, updates, retrieves, or deletes a content model (schema) in Agility CMS. Models define the structure and fields for content items. Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['get', 'save', 'delete'])
        .describe('Operation: "get" to retrieve, "save" to create/update, "delete" to remove'),
      modelId: z
        .number()
        .optional()
        .describe('Model ID. Required for delete. Can be used for get.'),
      referenceName: z
        .string()
        .optional()
        .describe('Model reference name. Can be used for get.'),
      modelData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Full model definition for save operations (includes fields, displayName, etc.)'
        )
    })
  )
  .output(
    z.object({
      model: z
        .record(z.string(), z.any())
        .optional()
        .describe('The retrieved or saved model definition'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region,
      authMethod: ctx.auth.authMethod
    });

    switch (ctx.input.operation) {
      case 'get': {
        let identifier = ctx.input.modelId ?? ctx.input.referenceName;
        if (!identifier)
          throw createApiServiceError('modelId or referenceName is required for get');
        let model = await client.getModel(identifier);
        return {
          output: { model: model ?? undefined, success: Boolean(model) },
          message: model
            ? `Retrieved content model **${ctx.input.referenceName || ctx.input.modelId}**`
            : 'No content model matched the requested identifier.'
        };
      }
      case 'save': {
        if (!ctx.input.modelData)
          throw createApiServiceError('modelData is required for save');
        let result = await client.saveModel(ctx.input.modelData);
        return {
          output: { model: result, success: true },
          message: `Saved content model`
        };
      }
      case 'delete': {
        if (!ctx.input.modelId) throw createApiServiceError('modelId is required for delete');
        await client.deleteModel(ctx.input.modelId);
        return {
          output: { success: true },
          message: `Deleted content model **#${ctx.input.modelId}**`
        };
      }
    }
  })
  .build();
