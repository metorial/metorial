import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let purgeDataset = SlateTool.create(spec, {
  name: 'Purge Dataset',
  key: 'purge_dataset',
  description: `Removes all rows of data from a dataset while keeping the dataset structure intact. Useful for clearing data before a full re-sync without needing to recreate the dataset.`,
  constraints: ['Purged data cannot be restored.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('UUID of the dataset to purge')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the purge request'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.purgeDataset(ctx.input.datasetId);

    return {
      output: {
        status: result.status,
        message: result.message
      },
      message: `All data in dataset **${ctx.input.datasetId}** has been purged. The dataset structure remains intact.`
    };
  })
  .build();
