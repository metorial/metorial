import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listObjectFields = SlateTool.create(spec, {
  name: 'List Object Fields',
  key: 'list_object_fields',
  description: `Retrieve all fields for a given Fireberry object type. Returns field names, labels, types, and system metadata.
Use this to discover available fields before creating or updating records, or before building queries.`,
  instructions: [
    'Use the object type number (e.g., 1 for accounts). Use the List Objects tool to discover object type numbers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectId: z
        .union([z.number(), z.string()])
        .describe('The object type number (e.g., 1 for accounts, 2 for contacts)')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            label: z.string().describe('Display label of the field'),
            fieldName: z.string().describe('System field name used in API calls'),
            systemFieldTypeId: z.string().describe('Field type identifier'),
            fieldObjectType: z.string().describe('Object type this field belongs to'),
            systemName: z.string().describe('System name of the field')
          })
        )
        .describe('All fields for the object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let fields = await client.getObjectFields(ctx.input.objectId);

    return {
      output: { fields },
      message: `Found **${fields.length}** fields for object type **${ctx.input.objectId}**.`
    };
  })
  .build();
