import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
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
  processingState: z.string().optional().describe('Processing state'),
  featureCount: z.number().optional().nullable().describe('Number of features detected'),
  isLatestVersion: z.boolean().optional().describe('Whether this is the latest version')
});

export let getDataset = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description: `Retrieve detailed information about a specific dataset in the AI Catalog including its feature counts, size, and processing state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to retrieve')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let d = await client.getDataset(ctx.input.datasetId);

    return {
      output: parseOutput(outputSchema, {
        raw: d,
        datasetId: d.datasetId ?? d.id,
        name: d.name,
        categories: d.categories,
        createdBy: d.createdBy === null ? undefined : d.createdBy,
        createdAt: d.creationDate ?? d.createdAt,
        datasetSize: d.datasetSize,
        rowCount: d.rowCount,
        columnCount: d.columnCount,
        processingState: d.processingState,
        featureCount: d.featureCount,
        isLatestVersion: d.isLatestVersion
      }),
      message: `Dataset **${d.name}** — ${d.rowCount ?? '?'} rows, ${d.columnCount ?? '?'} columns.`
    };
  })
  .build();
