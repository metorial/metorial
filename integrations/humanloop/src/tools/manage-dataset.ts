import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

let datapointSchema = z.object({
  inputs: z
    .record(z.string(), z.any())
    .optional()
    .describe('Input variables for the datapoint'),
  messages: z
    .array(
      z.object({
        role: z.string().describe('Role of the message sender'),
        content: z.string().describe('Content of the message')
      })
    )
    .optional()
    .describe('Conversation messages for the datapoint'),
  target: z
    .record(z.string(), z.any())
    .optional()
    .describe('Expected target output for the datapoint')
});

export let manageDataset = SlateTool.create(spec, {
  name: 'Manage Dataset',
  key: 'manage_dataset',
  description:
    'DEPRECATED — Humanloop shut down on September 8, 2025. This operation is unavailable; the tool is retained only for compatibility.',
  instructions: [
    'Humanloop is retired. Do not use this tool for new workflows; use data exported before September 8, 2025 with your chosen replacement platform.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'delete', 'list_datapoints'])
        .describe('Action to perform'),
      datasetId: z
        .string()
        .optional()
        .describe('Dataset ID (required for get, update, delete, list_datapoints)'),
      path: z
        .string()
        .optional()
        .describe('Path for the dataset (e.g. "folder/my-dataset"). Used for create.'),
      datapointAction: z
        .enum(['set', 'add', 'remove'])
        .optional()
        .describe(
          'How to handle datapoints: "set" replaces all, "add" appends, "remove" deletes'
        ),
      datapoints: z.array(datapointSchema).optional().describe('Datapoints to add/set/remove'),
      versionName: z.string().optional().describe('Name for this version'),
      versionDescription: z.string().optional().describe('Description for this version'),
      name: z.string().optional().describe('New name for the dataset (for update)'),
      includeDatapoints: z
        .boolean()
        .optional()
        .describe('Include datapoints in the get response'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Page size for pagination')
    })
  )
  .output(
    z.object({
      dataset: z.any().optional().describe('Dataset details'),
      datasets: z.array(z.any()).optional().describe('List of datasets'),
      datapoints: z.array(z.any()).optional().describe('List of datapoints'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
