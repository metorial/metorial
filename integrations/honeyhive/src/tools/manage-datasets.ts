import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List datasets in a project, optionally filtering by type or specific dataset ID. Datasets contain curated input/output pairs used for evaluations and experiments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      type: z
        .enum(['evaluation', 'fine-tuning'])
        .optional()
        .describe('Filter by dataset type'),
      datasetId: z.string().optional().describe('Filter by specific dataset ID')
    })
  )
  .output(
    z.object({
      datasets: z
        .array(
          z.object({
            datasetId: z.string().describe('Dataset ID'),
            name: z.string().describe('Dataset name'),
            description: z.string().optional().describe('Dataset description'),
            type: z.string().optional().describe('Dataset type'),
            numPoints: z.number().optional().describe('Number of datapoints'),
            pipelineType: z.string().optional().describe('Pipeline type (event or session)'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    let data = await client.listDatasets({
      project,
      type: ctx.input.type,
      dataset_id: ctx.input.datasetId
    });

    let datasets = (data.testcases || data.datasets || []).map((d: any) => ({
      datasetId: d._id || d.id,
      name: d.name,
      description: d.description,
      type: d.type,
      numPoints: d.num_points,
      pipelineType: d.pipeline_type,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { datasets },
      message: `Found **${datasets.length}** dataset(s).`
    };
  })
  .build();

export let createDataset = SlateTool.create(spec, {
  name: 'Create Dataset',
  key: 'create_dataset',
  description: `Create a new dataset in a project. Datasets hold curated datapoints for running evaluations and experiments.`
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      name: z.string().describe('Name of the dataset'),
      description: z.string().optional().describe('Description of the dataset'),
      type: z
        .enum(['evaluation', 'fine-tuning'])
        .optional()
        .default('evaluation')
        .describe('Type of dataset'),
      pipelineType: z
        .enum(['event', 'session'])
        .optional()
        .default('event')
        .describe('Pipeline type'),
      metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata')
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('ID of the created dataset'),
      inserted: z.boolean().describe('Whether the dataset was inserted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    let data = await client.createDataset({
      project,
      name: ctx.input.name,
      description: ctx.input.description,
      type: ctx.input.type,
      pipeline_type: ctx.input.pipelineType,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        datasetId: data.result?.insertedId || data._id || data.id,
        inserted: data.inserted ?? true
      },
      message: `Created dataset **${ctx.input.name}**.`
    };
  })
  .build();

export let updateDataset = SlateTool.create(spec, {
  name: 'Update Dataset',
  key: 'update_dataset',
  description: `Update an existing dataset's name, description, or metadata.`
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      metadata: z.record(z.string(), z.any()).optional().describe('Updated metadata')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.updateDataset({
      dataset_id: ctx.input.datasetId,
      name: ctx.input.name,
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });

    return {
      output: { success: true },
      message: `Updated dataset \`${ctx.input.datasetId}\`.`
    };
  })
  .build();

export let deleteDataset = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Delete a dataset by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.deleteDataset(ctx.input.datasetId);

    return {
      output: { success: true },
      message: `Deleted dataset \`${ctx.input.datasetId}\`.`
    };
  })
  .build();

export let addDatapointsToDataset = SlateTool.create(spec, {
  name: 'Add Datapoints to Dataset',
  key: 'add_datapoints_to_dataset',
  description: `Add raw data records to a dataset with a field mapping. The mapping defines which fields from the raw data should be used as inputs, ground truths, and history.`,
  instructions: [
    'The "mapping" field maps keys from your raw data objects to their roles (inputs, ground_truth, history).'
  ]
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the target dataset'),
      project: z
        .string()
        .optional()
        .describe('Project name. Falls back to the configured default project.'),
      records: z.array(z.record(z.string(), z.any())).describe('Raw data records to add'),
      mapping: z
        .object({
          inputs: z.array(z.string()).describe('Keys from records to use as inputs'),
          groundTruth: z
            .array(z.string())
            .describe('Keys from records to use as ground truth'),
          history: z
            .array(z.string())
            .default([])
            .describe('Keys from records to use as chat history')
        })
        .describe('Mapping of record keys to datapoint fields')
    })
  )
  .output(
    z.object({
      datapointIds: z.array(z.string()).describe('IDs of the created datapoints'),
      inserted: z.boolean().describe('Whether the datapoints were inserted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;
    if (!project) {
      throw new Error('Project name is required.');
    }

    let data = await client.addDatapoints(ctx.input.datasetId, {
      project,
      data: ctx.input.records,
      mapping: {
        inputs: ctx.input.mapping.inputs,
        ground_truth: ctx.input.mapping.groundTruth,
        history: ctx.input.mapping.history
      }
    });

    return {
      output: {
        datapointIds: data.datapoint_ids || [],
        inserted: data.inserted ?? true
      },
      message: `Added **${data.datapoint_ids?.length ?? 0}** datapoints to dataset \`${ctx.input.datasetId}\`.`
    };
  })
  .build();
