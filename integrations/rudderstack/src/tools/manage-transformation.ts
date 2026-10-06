import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient, stringField } from '../lib/client';
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
    destructive: true,
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
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let { action, transformationId, name, code, language, description, publish } = ctx.input;
    if (action === 'delete') {
      if (!transformationId)
        throw createApiServiceError('Transformation ID is required for delete.');
      await client.deleteTransformation(transformationId);
      return {
        output: { transformationId, deleted: true },
        message:
          'Deleted the transformation. Revision history may remain retained by RudderStack.'
      };
    }
    if (action === 'create' && (!name?.trim() || !code?.trim()))
      throw createApiServiceError('Name and code are required for create.');
    if (action === 'update' && !transformationId)
      throw createApiServiceError('Transformation ID is required for update.');
    let resource =
      action === 'create'
        ? await client.createTransformation({ name, code, language, description, publish })
        : await client.updateTransformation(transformationId!, {
            name,
            code,
            language,
            description,
            publish
          });
    return {
      output: {
        transformationId: stringField(resource.id, 'the resource ID'),
        name: typeof resource.name === 'string' ? resource.name : undefined,
        versionId: stringField(resource.versionId, 'the revision ID'),
        published:
          typeof resource.isPublished === 'boolean' ? resource.isPublished : (publish ?? false)
      },
      message:
        action === 'create'
          ? 'Created the transformation revision.'
          : 'Updated the transformation revision.'
    };
  })
  .build();
