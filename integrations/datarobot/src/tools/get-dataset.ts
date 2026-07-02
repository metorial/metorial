import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let getDataset = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description: `Retrieve detailed information about a specific dataset in the AI Catalog including its schema, feature types, size, and processing state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to retrieve')
    })
  )
  .output(
    z.object({
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let d = await client.getDataset(ctx.input.datasetId);

    return {
      output: {
        datasetId: d.datasetId || d.id,
        name: d.name,
        categories: d.categories,
        createdBy: d.createdBy,
        createdAt: d.createdAt,
        datasetSize: d.datasetSize,
        rowCount: d.rowCount,
        columnCount: d.columnCount,
        processingState: d.processingState,
        featureCount: d.featureCount,
        isLatestVersion: d.isLatestVersion
      },
      message: `Dataset **${d.name}** — ${d.rowCount ?? '?'} rows, ${d.columnCount ?? '?'} columns.`
    };
  })
  .build();
