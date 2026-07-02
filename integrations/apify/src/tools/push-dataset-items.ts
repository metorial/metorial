import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { jsonObjectSchema, requireArray } from './shared';

export let pushDatasetItems = SlateTool.create(spec, {
  name: 'Push Dataset Items',
  key: 'push_dataset_items',
  description: `Append JSON objects to an Apify dataset. Datasets are append-only and are commonly used for Actor output records.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset ID to append items to'),
      items: z.array(jsonObjectSchema).describe('Non-empty array of JSON objects to append')
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('Dataset ID'),
      pushed: z.boolean().describe('Whether the items were pushed'),
      itemCount: z.number().describe('Number of items pushed')
    })
  )
  .handleInvocation(async ctx => {
    let items = requireArray(ctx.input.items, 'items');
    let client = new ApifyClient({ token: ctx.auth.token });
    await client.pushDatasetItems(ctx.input.datasetId, items);

    return {
      output: {
        datasetId: ctx.input.datasetId,
        pushed: true,
        itemCount: items.length
      },
      message: `Pushed **${items.length}** item(s) to dataset \`${ctx.input.datasetId}\`.`
    };
  })
  .build();
