import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageSavedObject = SlateTool.create(spec, {
  name: 'Manage Saved Object',
  key: 'manage_saved_object',
  description: `Get, create, update, or delete a Kibana saved object. Supports dashboards, visualizations, maps, data views, Canvas workpads, and other saved object types.
Provide the action to perform along with the object type and ID.`,
  instructions: [
    'To create an object, provide the type and attributes. Optionally provide an objectId to set a custom ID.',
    'To update an object, provide the type, objectId, and new attributes.',
    'To delete an object, provide the type and objectId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('Action to perform on the saved object'),
      objectType: z
        .string()
        .describe(
          'Type of saved object (e.g., "dashboard", "visualization", "index-pattern")'
        ),
      objectId: z
        .string()
        .optional()
        .describe('ID of the saved object (required for get, update, delete)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Object attributes (for create and update)'),
      references: z
        .array(
          z.object({
            referenceId: z.string().describe('ID of the referenced object'),
            name: z.string().describe('Reference name'),
            type: z.string().describe('Type of the referenced object')
          })
        )
        .optional()
        .describe('References to other saved objects'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Overwrite existing object if ID matches (for create only)'),
      force: z
        .boolean()
        .optional()
        .describe('Force deletion even if the object has references (for delete only)')
    })
  )
  .output(
    z.object({
      objectId: z.string().describe('ID of the saved object'),
      type: z.string().describe('Type of the saved object'),
      attributes: z.record(z.string(), z.any()).optional().describe('Object attributes'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      references: z
        .array(
          z.object({
            referenceId: z.string(),
            name: z.string(),
            type: z.string()
          })
        )
        .optional()
        .describe('References to other saved objects'),
      deleted: z.boolean().optional().describe('Whether the object was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, objectType, objectId, attributes, references, overwrite, force } = ctx.input;

    let mappedRefs = references?.map(r => ({ id: r.referenceId, name: r.name, type: r.type }));

    if (action === 'get') {
      if (!objectId) throw new Error('objectId is required for get action');
      let obj = await client.getSavedObject(objectType, objectId);
      return {
        output: {
          objectId: obj.id,
          type: obj.type,
          attributes: obj.attributes,
          updatedAt: obj.updated_at,
          references: obj.references?.map((ref: any) => ({
            referenceId: ref.id,
            name: ref.name,
            type: ref.type
          }))
        },
        message: `Retrieved saved object \`${objectType}/${objectId}\`.`
      };
    }

    if (action === 'create') {
      if (!attributes) throw new Error('attributes are required for create action');
      let obj = await client.createSavedObject(objectType, attributes, {
        objectId,
        references: mappedRefs,
        overwrite
      });
      return {
        output: {
          objectId: obj.id,
          type: obj.type,
          attributes: obj.attributes,
          updatedAt: obj.updated_at,
          references: obj.references?.map((ref: any) => ({
            referenceId: ref.id,
            name: ref.name,
            type: ref.type
          }))
        },
        message: `Created saved object \`${objectType}/${obj.id}\`.`
      };
    }

    if (action === 'update') {
      if (!objectId) throw new Error('objectId is required for update action');
      if (!attributes) throw new Error('attributes are required for update action');
      let obj = await client.updateSavedObject(objectType, objectId, attributes, {
        references: mappedRefs
      });
      return {
        output: {
          objectId: obj.id,
          type: obj.type,
          attributes: obj.attributes,
          updatedAt: obj.updated_at,
          references: obj.references?.map((ref: any) => ({
            referenceId: ref.id,
            name: ref.name,
            type: ref.type
          }))
        },
        message: `Updated saved object \`${objectType}/${objectId}\`.`
      };
    }

    if (action === 'delete') {
      if (!objectId) throw new Error('objectId is required for delete action');
      await client.deleteSavedObject(objectType, objectId, force);
      return {
        output: {
          objectId,
          type: objectType,
          deleted: true
        },
        message: `Deleted saved object \`${objectType}/${objectId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
