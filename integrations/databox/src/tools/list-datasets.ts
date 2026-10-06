import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdInput, pageInput, pageSizeInput, paginationSchema } from '../lib/models';
import { spec } from '../spec';

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `Lists datasets within a specific data source. v1 returns an unpaginated list; v2 returns one page with provider pagination. Use this to discover existing datasets before creating new ones or ingesting data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountIdInput,
      page: pageInput,
      pageSize: pageSizeInput,
      dataSourceId: z.number().describe('ID of the data source to list datasets for')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      datasets: z
        .array(
          z.object({
            datasetId: z
              .string()
              .describe('Dataset identifier: v1 UUID or v2 decimal ID encoded as text'),
            title: z.string().describe('Dataset title'),
            created: z.string().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of datasets in the data source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.listDatasets(ctx.input.dataSourceId, {
      accountId: ctx.input.accountId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let datasets = result.datasets;

    return {
      output: {
        pagination: result.pagination,
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
