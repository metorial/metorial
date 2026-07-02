import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let getDatasetItems = SlateTool.create(spec, {
  name: 'Get Dataset Items',
  key: 'get_dataset_items',
  description: `Retrieve items from an Apify dataset. Datasets store structured tabular data produced by Actor runs. You can filter by fields, paginate, and clean the results.
Use the dataset ID from an Actor run's output or from listing datasets.`,
  instructions: [
    "Provide either a datasetId directly or a runId to automatically use the run's default dataset.",
    'Use fields to select only specific properties, or omit to exclude properties.',
    'Enable clean to filter out empty items and hidden fields.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().optional().describe('Dataset ID (provide this or runId)'),
      runId: z
        .string()
        .optional()
        .describe(
          'Actor run ID to fetch default dataset items from (alternative to datasetId)'
        ),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of items to return (max 250000)'),
      offset: z.number().optional().default(0).describe('Pagination offset'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Only include these fields in the output'),
      omit: z.array(z.string()).optional().describe('Exclude these fields from the output'),
      descending: z
        .boolean()
        .optional()
        .default(false)
        .describe('Return items in reverse order'),
      clean: z
        .boolean()
        .optional()
        .default(false)
        .describe('Remove empty items and hidden fields')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('Dataset items'),
      itemCount: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let items: Record<string, any>[];

    if (ctx.input.runId) {
      items = await client.getRunDatasetItems(ctx.input.runId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        fields: ctx.input.fields,
        omit: ctx.input.omit,
        clean: ctx.input.clean
      });
    } else if (ctx.input.datasetId) {
      items = await client.getDatasetItems(ctx.input.datasetId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        fields: ctx.input.fields,
        omit: ctx.input.omit,
        desc: ctx.input.descending,
        clean: ctx.input.clean
      });
    } else {
      throw new Error('Either datasetId or runId must be provided.');
    }

    return {
      output: {
        items,
        itemCount: items.length
      },
      message: `Retrieved **${items.length}** item(s) from dataset.`
    };
  })
  .build();
