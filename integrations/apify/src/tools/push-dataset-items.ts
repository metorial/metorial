import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let pushDatasetItems = SlateTool.create(spec, {
  name: 'Push Dataset Items',
  key: 'push_dataset_items',
  description: `Append items to an Apify dataset. Datasets are append-only structured storage. Use this to add scraped data, processed results, or any structured records to a dataset.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset ID to push items to'),
      items: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of JSON objects to append to the dataset')
    })
  )
  .output(
    z.object({
      pushed: z.boolean().describe('Whether the items were successfully pushed'),
      itemCount: z.number().describe('Number of items pushed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    await client.pushDatasetItems(ctx.input.datasetId, ctx.input.items);

    return {
      output: {
        pushed: true,
        itemCount: ctx.input.items.length
      },
      message: `Pushed **${ctx.input.items.length}** item(s) to dataset \`${ctx.input.datasetId}\`.`
    };
  })
  .build();
