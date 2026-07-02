import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteClassificationTool = SlateTool.create(spec, {
  name: 'Delete Classification',
  key: 'delete_classification',
  description: `Delete a document classification and all its associated data.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      classificationId: z
        .string()
        .describe('Unique identifier of the classification to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status'),
      deletedAt: z.number().describe('Timestamp of deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.deleteClassification(ctx.input.classificationId);

    return {
      output: {
        status: result.status,
        deletedAt: result.deletedAt
      },
      message: `Deleted classification \`${ctx.input.classificationId}\`.`
    };
  })
  .build();
