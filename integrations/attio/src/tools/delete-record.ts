import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecordTool = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a record from an Attio object. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectSlug: z
        .string()
        .describe('Object type slug or ID (e.g. "people", "companies", "deals")'),
      recordId: z.string().describe('The record ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the record was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    await client.deleteRecord(ctx.input.objectSlug, ctx.input.recordId);

    return {
      output: { deleted: true },
      message: `Deleted record **${ctx.input.recordId}** from **${ctx.input.objectSlug}**.`
    };
  })
  .build();
