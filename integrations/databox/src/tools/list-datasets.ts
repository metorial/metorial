import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `Lists all datasets within a specific data source. Use this to discover existing datasets before creating new ones or ingesting data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataSourceId: z.number().describe('ID of the data source to list datasets for')
    })
  )
  .output(
    z.object({
      datasets: z
        .array(
          z.object({
            datasetId: z.string().describe('Unique dataset identifier (UUID)'),
            title: z.string().describe('Dataset title'),
            created: z.string().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of datasets in the data source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let datasets = await client.listDatasets(ctx.input.dataSourceId);

    return {
      output: {
        datasets: datasets.map(d => ({
          datasetId: d.id,
          title: d.title,
          created: d.created
        }))
      },
      message: `Found **${datasets.length}** dataset(s) in data source **${ctx.input.dataSourceId}**.`
    };
  })
  .build();
