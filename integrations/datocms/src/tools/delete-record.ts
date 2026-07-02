import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRecord = SlateTool.create(spec, {
  name: 'Delete Record',
  key: 'delete_record',
  description: `Permanently delete a content record by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      recordId: z.string().describe('ID of the record to delete')
    })
  )
  .output(
    z.object({
      record: z.any().describe('The deleted record object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let record = await client.deleteRecord(ctx.input.recordId);

    return {
      output: { record },
      message: `Deleted record with ID **${ctx.input.recordId}**.`
    };
  })
  .build();
