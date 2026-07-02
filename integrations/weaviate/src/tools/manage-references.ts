import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageReferences = SlateTool.create(spec, {
  name: 'Manage Cross-References',
  key: 'manage_references',
  description: `Add or remove cross-references between objects across collections. Cross-references create links between objects, enabling graph-like data traversal.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the cross-reference'),
      collectionName: z.string().describe('Source collection name'),
      objectId: z.string().describe('Source object UUID'),
      referenceProperty: z
        .string()
        .describe('Name of the cross-reference property on the source object'),
      targetCollectionName: z.string().describe('Target collection name'),
      targetObjectId: z.string().describe('Target object UUID'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      sourceObjectId: z.string().describe('Source object UUID'),
      targetObjectId: z.string().describe('Target object UUID'),
      referenceProperty: z.string().describe('Reference property name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      collectionName,
      objectId,
      referenceProperty,
      targetCollectionName,
      targetObjectId,
      tenant
    } = ctx.input;

    let beacon = `weaviate://localhost/${targetCollectionName}/${targetObjectId}`;

    if (action === 'add') {
      await client.addReference(collectionName, objectId, referenceProperty, {
        beacon,
        tenant
      });
    } else {
      await client.deleteReference(collectionName, objectId, referenceProperty, {
        beacon,
        tenant
      });
    }

    return {
      output: {
        action,
        sourceObjectId: objectId,
        targetObjectId,
        referenceProperty
      },
      message: `${action === 'add' ? 'Added' : 'Removed'} cross-reference from **${objectId}** → **${targetObjectId}** via property **${referenceProperty}**.`
    };
  })
  .build();
