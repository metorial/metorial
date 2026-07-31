import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteObject = SlateTool.create(spec, {
  name: 'Delete Object',
  key: 'delete_object',
  description:
    'Soft-delete an item record by ID. Relationships involving the record are also soft-deleted.',
  docs: [
    {
      type: 'docs.action.general',
      name: 'Delete an object',
      url: 'https://docs.item.app/api-reference/objects/delete-an-object'
    }
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .trim()
        .min(1)
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      objectId: z.number().int().positive().describe('Record ID to delete')
    })
  )
  .output(
    z.object({
      success: z.literal(true).describe('Confirms that item accepted the deletion'),
      objectId: z.number().int().positive().describe('Deleted record ID'),
      objectType: z.string().describe('Object type containing the deleted record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteObject(ctx.input.objectType, ctx.input.objectId);

    return {
      output: {
        success: result.success,
        objectId: ctx.input.objectId,
        objectType: ctx.input.objectType
      },
      message: `Soft-deleted record **${ctx.input.objectId}** from **${ctx.input.objectType}**.`
    };
  })
  .build();
