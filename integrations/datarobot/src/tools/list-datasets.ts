import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z.object({
  datasetId: z.string().describe('Unique dataset identifier'),
  name: z.string().optional().describe('Dataset name'),
  categories: z.array(z.string()).optional().describe('Dataset categories'),
  createdBy: z.string().optional().describe('User who created the dataset'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  datasetSize: z.number().optional().nullable().describe('Dataset size in bytes'),
  rowCount: z.number().optional().nullable().describe('Number of rows'),
  columnCount: z.number().optional().nullable().describe('Number of columns'),
  processingState: z.string().optional().describe('Processing state of the dataset')
});

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List datasets in the DataRobot AI Catalog. Returns metadata including name, size, row/column counts, and processing state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of datasets to return')
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetSchema).describe('List of datasets in the catalog'),
      totalCount: z.number().optional().describe('Total number of datasets available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let result = await client.listDatasets({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let items = result.data || result;
    let datasets = (Array.isArray(items) ? items : []).map((d: any) => ({
      datasetId: d.datasetId || d.id,
      name: d.name,
      categories: d.categories,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
      datasetSize: d.datasetSize,
      rowCount: d.rowCount,
      columnCount: d.columnCount,
      processingState: d.processingState
    }));

    return {
      output: {
        datasets,
        totalCount: result.totalCount || result.count || datasets.length
      },
      message: `Found **${datasets.length}** dataset(s) in the AI Catalog.`
    };
  })
  .build();
