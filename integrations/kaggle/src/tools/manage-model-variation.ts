import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

export let manageModelVariation = SlateTool.create(spec, {
  name: 'Manage Model Variation',
  key: 'manage_model_variation',
  description: `Create, update, or delete a model variation (instance) and manage variation versions. A variation represents a specific framework implementation (e.g., TensorFlow, PyTorch) of a model. You can also create new versions of existing variations.`,
  instructions: [
    'To create a variation: set action to "create_instance" and provide framework, instanceSlug, and overview.',
    'To update a variation: set action to "update_instance" and provide framework and variationSlug.',
    'To delete a variation: set action to "delete_instance" and provide framework and variationSlug.',
    'To create a version: set action to "create_version", provide framework, variationSlug, and files with upload tokens.',
    'To delete a version: set action to "delete_version", provide framework, variationSlug, and versionNumber.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create_instance',
          'update_instance',
          'delete_instance',
          'create_version',
          'delete_version'
        ])
        .describe('Action to perform'),
      ownerSlug: z.string().describe('Model owner username'),
      modelSlug: z.string().describe('Model slug/name'),
      framework: z
        .string()
        .describe('Framework identifier (e.g., "tensorflow", "pytorch", "jax")'),
      variationSlug: z
        .string()
        .optional()
        .describe('Variation/instance slug (required for update, delete, version operations)'),
      instanceSlug: z
        .string()
        .optional()
        .describe('Slug for the new variation (required for create_instance)'),
      overview: z.string().optional().describe('Overview/description of the variation'),
      licenseName: z.string().optional().describe('License name for the variation'),
      fineTunable: z.boolean().optional().describe('Whether the variation is fine-tunable'),
      trainingData: z.array(z.string()).optional().describe('Training data source references'),
      modelInstanceType: z.string().optional().describe('Instance type classification'),
      externalUrl: z.string().optional().describe('External URL for the variation'),
      versionNotes: z
        .string()
        .optional()
        .describe('Notes for the new version (used with create_version)'),
      versionNumber: z
        .number()
        .optional()
        .describe('Version number to delete (used with delete_version)'),
      files: z
        .array(
          z.object({
            fileToken: z.string().describe('Upload token for the file'),
            fileDescription: z.string().optional().describe('Description of the file')
          })
        )
        .optional()
        .describe('Files for a new version')
    })
  )
  .output(
    z
      .object({
        success: z.boolean().describe('Whether the operation succeeded'),
        error: z.string().optional().describe('Error message if operation failed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let { action, ownerSlug, modelSlug, framework, variationSlug } = ctx.input;

    if (action === 'create_instance') {
      let result = await client.createModelInstance(ownerSlug, modelSlug, {
        framework,
        overview: ctx.input.overview ?? '',
        instanceSlug: ctx.input.instanceSlug!,
        licenseName: ctx.input.licenseName,
        fineTunable: ctx.input.fineTunable,
        trainingData: ctx.input.trainingData,
        modelInstanceType: ctx.input.modelInstanceType,
        externalUrl: ctx.input.externalUrl
      });
      return {
        output: { success: true, ...(result ?? {}) },
        message: `Created model variation **${framework}/${ctx.input.instanceSlug}** for ${ownerSlug}/${modelSlug}.`
      };
    }

    if (action === 'update_instance') {
      let result = await client.updateModelInstance(
        ownerSlug,
        modelSlug,
        framework,
        variationSlug!,
        {
          overview: ctx.input.overview,
          licenseName: ctx.input.licenseName,
          fineTunable: ctx.input.fineTunable,
          trainingData: ctx.input.trainingData,
          modelInstanceType: ctx.input.modelInstanceType,
          externalUrl: ctx.input.externalUrl
        }
      );
      return {
        output: { success: true, ...(result ?? {}) },
        message: `Updated model variation **${framework}/${variationSlug}** for ${ownerSlug}/${modelSlug}.`
      };
    }

    if (action === 'delete_instance') {
      let result = await client.deleteModelInstance(
        ownerSlug,
        modelSlug,
        framework,
        variationSlug!
      );
      return {
        output: { success: true, ...(result ?? {}) },
        message: `Deleted model variation **${framework}/${variationSlug}** from ${ownerSlug}/${modelSlug}.`
      };
    }

    if (action === 'create_version') {
      let mappedFiles = (ctx.input.files ?? []).map(f => ({
        token: f.fileToken,
        description: f.fileDescription
      }));
      let result = await client.createModelInstanceVersion(
        ownerSlug,
        modelSlug,
        framework,
        variationSlug!,
        {
          versionNotes: ctx.input.versionNotes,
          files: mappedFiles
        }
      );
      return {
        output: { success: true, ...(result ?? {}) },
        message: `Created new version of variation **${framework}/${variationSlug}** for ${ownerSlug}/${modelSlug}.`
      };
    }

    // delete_version
    let result = await client.deleteModelInstanceVersion(
      ownerSlug,
      modelSlug,
      framework,
      variationSlug!,
      ctx.input.versionNumber!
    );
    return {
      output: { success: true, ...(result ?? {}) },
      message: `Deleted version ${ctx.input.versionNumber} of variation **${framework}/${variationSlug}** from ${ownerSlug}/${modelSlug}.`
    };
  })
  .build();
