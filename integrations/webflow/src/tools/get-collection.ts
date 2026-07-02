import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.string().describe('Unique identifier for the field'),
  displayName: z.string().describe('Display name of the field'),
  slug: z.string().optional().describe('API slug for the field'),
  type: z.string().optional().describe('Field type (e.g., PlainText, RichText, Number, etc.)'),
  isRequired: z.boolean().optional().describe('Whether the field is required'),
  isEditable: z.boolean().optional().describe('Whether the field can be edited')
});

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve detailed information about a CMS collection including its fields/schema. Useful for understanding the structure of a collection before creating or updating items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('Unique identifier of the CMS collection')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('Unique identifier for the collection'),
      displayName: z.string().describe('Display name of the collection'),
      singularName: z.string().optional().describe('Singular name of the collection'),
      slug: z.string().optional().describe('URL slug of the collection'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
      fields: z.array(fieldSchema).describe('Fields defined in the collection schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let c = await client.getCollection(ctx.input.collectionId);

    let fields = (c.fields ?? []).map((f: any) => ({
      fieldId: f.id,
      displayName: f.displayName ?? '',
      slug: f.slug,
      type: f.type,
      isRequired: f.isRequired,
      isEditable: f.isEditable
    }));

    return {
      output: {
        collectionId: c.id,
        displayName: c.displayName ?? '',
        singularName: c.singularName,
        slug: c.slug,
        createdOn: c.createdOn,
        lastUpdated: c.lastUpdated,
        fields
      },
      message: `Retrieved collection **${c.displayName}** with **${fields.length}** field(s).`
    };
  })
  .build();
