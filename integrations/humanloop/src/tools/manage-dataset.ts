import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  description: `Create, update, retrieve, or delete datasets and their datapoints. Datasets are collections of test cases used for evaluations and fine-tuning. Each datapoint contains inputs, optional messages, and optional target outputs. Supports adding, removing, or replacing datapoints in a dataset.`,
  instructions: [
    'Use action "set" to replace all datapoints, "add" to append, or "remove" to delete specific datapoints.',
    'When listing datapoints, use the "get" action with includeDatapoints set to true.'
  ],
  tags: {
    destructive: false,
    readOnly: false
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listDatasets({
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: { datasets: result.records, total: result.total },
        message: `Found **${result.total}** datasets.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.datasetId) throw new Error('datasetId is required for get action');
      let dataset = await client.getDataset(ctx.input.datasetId, {
        includeDatapoints: ctx.input.includeDatapoints
      });
      return {
        output: { dataset },
        message: `Retrieved dataset **${dataset.name || dataset.path}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.datasetId) body.id = ctx.input.datasetId;
      if (ctx.input.datapointAction) body.action = ctx.input.datapointAction;
      if (ctx.input.datapoints) body.datapoints = ctx.input.datapoints;
      if (ctx.input.versionName) body.version_name = ctx.input.versionName;
      if (ctx.input.versionDescription)
        body.version_description = ctx.input.versionDescription;

      let dataset = await client.upsertDataset(body);
      return {
        output: { dataset },
        message: `Created/updated dataset **${dataset.name || dataset.path}** with ${ctx.input.datapoints?.length || 0} datapoints.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.datasetId) throw new Error('datasetId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.name) body.name = ctx.input.name;
      let dataset = await client.updateDataset(ctx.input.datasetId, body);
      return {
        output: { dataset },
        message: `Updated dataset **${dataset.name || dataset.path}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.datasetId) throw new Error('datasetId is required for delete action');
      await client.deleteDataset(ctx.input.datasetId);
      return {
        output: {},
        message: `Deleted dataset **${ctx.input.datasetId}**.`
      };
    }

    if (ctx.input.action === 'list_datapoints') {
      if (!ctx.input.datasetId)
        throw new Error('datasetId is required for list_datapoints action');
      let result = await client.listDatapoints(ctx.input.datasetId, {
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: { datapoints: result.records, total: result.total },
        message: `Found **${result.total}** datapoints in dataset.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
