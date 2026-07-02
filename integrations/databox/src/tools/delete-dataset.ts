import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDataset = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Permanently deletes a dataset and all its associated data. This action is irreversible. Use **Purge Dataset** instead if you want to clear the data but keep the dataset structure.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('UUID of the dataset to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the deletion request'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteDataset(ctx.input.datasetId);

    return {
      output: {
        status: result.status,
        message: result.message
      },
      message: `Dataset **${ctx.input.datasetId}** has been permanently deleted.`
    };
  })
  .build();
