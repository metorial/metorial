import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient, responseItems } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let datasetSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),
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

let outputSchema = z.object({
  datasets: z.array(datasetSchema).describe('List of datasets in the catalog'),
  totalCount: z.number().optional().describe('Total number of datasets available')
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let result = await client.listDatasets({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let items = responseItems(result, 'datasets');
    let datasets = items.map((d: any) => ({
      raw: d,
      datasetId: d.datasetId ?? d.id,
      name: d.name,
      categories: d.categories,
      createdBy: d.createdBy === null ? undefined : d.createdBy,
      createdAt: d.creationDate ?? d.createdAt,
      datasetSize: d.datasetSize,
      rowCount: d.rowCount,
      columnCount: d.columnCount,
      processingState: d.processingState
    }));

    return {
      output: parseOutput(outputSchema, {
        datasets,
        totalCount: result.totalCount
      }),
      message: `Found **${datasets.length}** dataset(s) in the AI Catalog.`
    };
  })
  .build();
