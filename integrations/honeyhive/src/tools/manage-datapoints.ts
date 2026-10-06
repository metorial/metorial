import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const projectSchema = z
  .string()
  .optional()
  .describe(
    'Legacy project selector retained for compatibility. The connection API key determines the project; this value does not change its scope.'
  );
const datapointFields = {
  inputs: z.record(z.string(), z.unknown()).describe('Input values for the evaluation case'),
  history: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Conversation history'),
  groundTruth: z.record(z.string(), z.unknown()).optional().describe('Expected outputs'),
  linkedDatasetIds: z
    .array(z.string())
    .optional()
    .describe('Dataset IDs. Call list_datasets to discover datasets.'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Datapoint metadata')
};
const datapointOutput = z.object({
  datapointId: z.string(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  history: z.array(z.record(z.string(), z.unknown())).optional(),
  groundTruth: z.record(z.string(), z.unknown()).optional(),
  linkedDatasetIds: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

const mapDatapoint = (point: Record<string, unknown>) => {
  let parsed = datapointOutput.safeParse({
    datapointId: point._id || point.id || point.datapoint_id,
    inputs: point.inputs ?? undefined,
    history: point.history ?? undefined,
    groundTruth: point.ground_truth ?? undefined,
    linkedDatasetIds: point.linked_datasets ?? undefined,
    metadata: point.metadata ?? undefined,
    createdAt: point.created_at,
    updatedAt: point.updated_at
  });
  if (!parsed.success)
    throw createApiServiceError('HoneyHive returned an invalid datapoint.', {
      reason: 'honeyhive_invalid_response'
    });
  return parsed.data;
};

export const listDatapoints = SlateTool.create(spec, {
  key: 'list_datapoints',
  name: 'List Datapoints',
  description:
    'List evaluation datapoints in a project, optionally filtering by dataset name or datapoint IDs. The connection API key selects the project.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      project: projectSchema,
      datasetName: z
        .string()
        .optional()
        .describe('Dataset name. Call list_datasets to discover names.'),
      datapointIds: z
        .array(z.string())
        .optional()
        .describe('Restrict the result to these datapoint IDs')
    })
  )
  .output(z.object({ datapoints: z.array(datapointOutput) }))
  .handleInvocation(async ctx => {
    let project = ctx.input.project || ctx.config.project;
    let client = new Client({ token: ctx.auth.token, serverUrl: ctx.config.serverUrl });
    let data = await client.listDatapoints({
      project,
      dataset_name: ctx.input.datasetName,
      datapoint_ids: ctx.input.datapointIds
    });
    let datapoints = (data.datapoints || []).map(mapDatapoint);
    return { output: { datapoints }, message: `Found ${datapoints.length} datapoint(s).` };
  })
  .build();

export const createDatapoint = SlateTool.create(spec, {
  key: 'create_datapoint',
  name: 'Create Datapoint',
  description:
    'Create an evaluation datapoint with inputs, expected outputs, conversation history, and optional dataset associations. The connection API key selects the project.'
})
  .input(
    z.object({
      project: projectSchema,
      ...datapointFields,
      linkedEventId: z.string().optional().describe('Source event ID for this datapoint')
    })
  )
  .output(z.object({ datapointId: z.string() }))
  .handleInvocation(async ctx => {
    let project = ctx.input.project || ctx.config.project;
    let client = new Client({ token: ctx.auth.token, serverUrl: ctx.config.serverUrl });
    let data = await client.createDatapoint({
      project,
      inputs: ctx.input.inputs,
      history: ctx.input.history,
      ground_truth: ctx.input.groundTruth,
      linked_event: ctx.input.linkedEventId,
      linked_datasets: ctx.input.linkedDatasetIds,
      metadata: ctx.input.metadata
    });
    let datapointId = data.result?.insertedId || data.datapoint_id || data.id || data._id;
    if (!datapointId)
      throw createApiServiceError('HoneyHive did not return the created datapoint ID.', {
        reason: 'honeyhive_invalid_response'
      });
    return { output: { datapointId }, message: `Created datapoint ${datapointId}.` };
  })
  .build();

export const getDatapoint = SlateTool.create(spec, {
  key: 'get_datapoint',
  name: 'Get Datapoint',
  description:
    'Retrieve an evaluation datapoint by its ID. Call list_datapoints to discover IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ datapointId: z.string().describe('Datapoint ID') }))
  .output(datapointOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, serverUrl: ctx.config.serverUrl });
    let data = await client.getDatapoint(ctx.input.datapointId);
    let point = Array.isArray(data.datapoint) ? data.datapoint[0] : data.datapoint;
    if (!point)
      throw createApiServiceError('HoneyHive did not return the requested datapoint.', {
        reason: 'honeyhive_datapoint_not_found'
      });
    let output = mapDatapoint(point);
    if (output.datapointId !== ctx.input.datapointId)
      throw createApiServiceError('HoneyHive returned a different datapoint ID.', {
        reason: 'honeyhive_invalid_response'
      });
    return {
      output,
      message: `Retrieved datapoint ${ctx.input.datapointId}.`
    };
  })
  .build();

export const updateDatapoint = SlateTool.create(spec, {
  key: 'update_datapoint',
  name: 'Update Datapoint',
  description:
    'Update evaluation datapoint inputs, expected outputs, history, metadata, or dataset associations.'
})
  .input(
    z.object({
      datapointId: z.string().describe('Datapoint ID. Call list_datapoints to discover IDs.'),
      ...datapointFields,
      inputs: datapointFields.inputs.optional()
    })
  )
  .output(z.object({ datapointId: z.string(), success: z.boolean() }))
  .handleInvocation(async ctx => {
    if (
      Object.entries(ctx.input).every(
        ([key, value]) => key === 'datapointId' || value === undefined
      )
    )
      throw createApiServiceError('Provide at least one field to update.');
    let client = new Client({ token: ctx.auth.token, serverUrl: ctx.config.serverUrl });
    await client.updateDatapoint(ctx.input.datapointId, {
      inputs: ctx.input.inputs,
      history: ctx.input.history,
      ground_truth: ctx.input.groundTruth,
      linked_datasets: ctx.input.linkedDatasetIds,
      metadata: ctx.input.metadata
    });
    return {
      output: { datapointId: ctx.input.datapointId, success: true },
      message: `Updated datapoint ${ctx.input.datapointId}.`
    };
  })
  .build();

export const deleteDatapoint = SlateTool.create(spec, {
  key: 'delete_datapoint',
  name: 'Delete Datapoint',
  description: 'Delete an evaluation datapoint by its ID.',
  tags: { destructive: true }
})
  .input(z.object({ datapointId: z.string().describe('Datapoint ID') }))
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, serverUrl: ctx.config.serverUrl });
    let data = await client.deleteDatapoint(ctx.input.datapointId);
    if (data?.deleted !== true)
      throw createApiServiceError('HoneyHive did not confirm datapoint deletion.', {
        reason: 'honeyhive_delete_failed'
      });
    return {
      output: { success: true },
      message: `Deleted datapoint ${ctx.input.datapointId}.`
    };
  })
  .build();
