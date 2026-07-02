import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let getVariables = SlateTool.create(spec, {
  name: 'Get Variables',
  key: 'get_variables',
  description: `Retrieve variables and variable collections from a Figma file. Variables store reusable values for design properties like colors, spacing, and typography. Supports both local (all variables) and published (library-shared) variables. Enterprise plans only.`,
  constraints: ['Requires Enterprise plan', 'Requires file_variables:read scope'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      publishedOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only return published/library variables')
    })
  )
  .output(
    z.object({
      variables: z.record(z.string(), z.any()).describe('Map of variable ID to variable data'),
      variableCollections: z
        .record(z.string(), z.any())
        .describe('Map of collection ID to collection data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    let result = ctx.input.publishedOnly
      ? await client.getPublishedVariables(ctx.input.fileKey)
      : await client.getLocalVariables(ctx.input.fileKey);

    let variables = result.meta?.variables || {};
    let variableCollections = result.meta?.variableCollections || {};

    let varCount = Object.keys(variables).length;
    let collectionCount = Object.keys(variableCollections).length;

    return {
      output: { variables, variableCollections },
      message: `Retrieved **${varCount}** variable(s) across **${collectionCount}** collection(s)`
    };
  })
  .build();

export let updateVariables = SlateTool.create(spec, {
  name: 'Update Variables',
  key: 'update_variables',
  description: `Create, update, or delete variables and variable collections in a Figma file. Supports batch operations on variable collections, variables, and variable modes. Enterprise plans only.`,
  constraints: ['Requires Enterprise plan', 'Requires file_variables:write scope'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      variableCollections: z
        .array(z.any())
        .optional()
        .describe('Variable collections to create/update/delete'),
      variables: z.array(z.any()).optional().describe('Variables to create/update/delete'),
      variableModes: z
        .array(z.any())
        .optional()
        .describe('Variable modes to create/update/delete')
    })
  )
  .output(
    z.object({
      status: z.number().describe('HTTP status code'),
      error: z.boolean().describe('Whether an error occurred'),
      meta: z.any().optional().describe('Response metadata with created/updated IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    let result = await client.postVariables(ctx.input.fileKey, {
      variableCollections: ctx.input.variableCollections,
      variables: ctx.input.variables,
      variableModes: ctx.input.variableModes
    });

    return {
      output: {
        status: result.status || 200,
        error: result.error || false,
        meta: result.meta
      },
      message: `Variables updated successfully`
    };
  })
  .build();
