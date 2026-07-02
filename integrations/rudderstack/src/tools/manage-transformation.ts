import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let manageTransformation = SlateTool.create(spec, {
  name: 'Manage Transformation',
  key: 'manage_transformation',
  description: `Create, update, or delete a RudderStack transformation. Transformations are custom JavaScript or Python functions that modify event payloads before they reach destinations.
Supports creating new transformations, updating code/description, publishing, and deleting transformations.`,
  instructions: [
    'Use action "create" to create a new transformation with name and code.',
    'Use action "update" to modify an existing transformation by its ID.',
    'Use action "delete" to remove a transformation by its ID.',
    'Set publish to true to make the transformation live for incoming event traffic.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      transformationId: z
        .string()
        .optional()
        .describe('Transformation ID (required for update and delete)'),
      name: z.string().optional().describe('Transformation name (required for create)'),
      code: z.string().optional().describe('JavaScript or Python transformation code'),
      language: z
        .enum(['javascript', 'python'])
        .optional()
        .describe('Programming language of the transformation code'),
      description: z.string().optional().describe('Description of the transformation'),
      publish: z
        .boolean()
        .optional()
        .describe('Whether to publish and make the transformation live')
    })
  )
  .output(
    z.object({
      transformationId: z.string().optional().describe('ID of the transformation'),
      name: z.string().optional().describe('Name of the transformation'),
      versionId: z.string().optional().describe('Version/revision ID'),
      published: z.boolean().optional().describe('Whether the transformation is published'),
      deleted: z.boolean().optional().describe('Whether the transformation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, transformationId, name, code, language, description, publish } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a transformation.');
      if (!code) throw new Error('Code is required when creating a transformation.');

      let result = await client.createTransformation({
        name,
        code,
        language,
        description,
        publish
      });
      let transformation = result.transformation || result;

      return {
        output: {
          transformationId: transformation.id,
          name: transformation.name,
          versionId: transformation.versionId,
          published: !!publish
        },
        message: `Created transformation **${transformation.name}**${publish ? ' and published it' : ''}.`
      };
    }

    if (action === 'update') {
      if (!transformationId) throw new Error('Transformation ID is required for update.');

      let result = await client.updateTransformation(transformationId, {
        code,
        description,
        publish
      });
      let transformation = result.transformation || result;

      return {
        output: {
          transformationId: transformation.id || transformationId,
          name: transformation.name,
          versionId: transformation.versionId,
          published: !!publish
        },
        message: `Updated transformation \`${transformationId}\`${publish ? ' and published it' : ''}.`
      };
    }

    if (action === 'delete') {
      if (!transformationId) throw new Error('Transformation ID is required for delete.');

      await client.deleteTransformation(transformationId);

      return {
        output: {
          transformationId,
          deleted: true
        },
        message: `Deleted transformation \`${transformationId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
