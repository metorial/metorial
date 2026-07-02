import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteObject = SlateTool.create(spec, {
  name: 'Delete Object',
  key: 'delete_object',
  description:
    'Soft-delete an item record by ID. Relationships involving the record are also soft-deleted.',
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      objectId: z.number().int().describe('Record ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the delete request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteObject(ctx.input.objectType, ctx.input.objectId);

    return {
      output: {
        success: !!result.success
      },
      message: `Deleted record **${ctx.input.objectId}** from **${ctx.input.objectType}**.`
    };
  })
  .build();
