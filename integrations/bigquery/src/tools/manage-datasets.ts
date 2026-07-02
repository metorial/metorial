import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List all datasets in the configured BigQuery project. Returns dataset IDs, friendly names, locations, and labels. Use the **filter** parameter to narrow results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      maxResults: z.number().optional().describe('Maximum number of datasets to return'),
      pageToken: z.string().optional().describe('Page token for paginated results'),
      includeHidden: z
        .boolean()
        .optional()
        .describe('Include hidden datasets prefixed with an underscore'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression (e.g., "labels.env:production")')
    })
  )
  .output(
    z.object({
      datasets: z.array(
        z.object({
          datasetId: z.string(),
          projectId: z.string(),
          friendlyName: z.string().optional(),
          location: z.string().optional(),
          labels: z.record(z.string(), z.string()).optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.listDatasets({
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      all: ctx.input.includeHidden,
      filter: ctx.input.filter
    });

    let datasets = (result.datasets || []).map((d: any) => ({
      datasetId: d.datasetReference.datasetId,
      projectId: d.datasetReference.projectId,
      friendlyName: d.friendlyName,
      location: d.location,
      labels: d.labels
    }));

    return {
      output: {
        datasets,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${datasets.length}** dataset(s).${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();

export let getDataset = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description: `Retrieve detailed information about a specific BigQuery dataset, including its schema, access controls, creation time, and configuration.`,
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
      datasetId: z.string(),
      projectId: z.string(),
      friendlyName: z.string().optional(),
      description: z.string().optional(),
      location: z.string(),
      creationTime: z.string(),
      lastModifiedTime: z.string(),
      defaultTableExpirationMs: z.string().optional(),
      defaultPartitionExpirationMs: z.string().optional(),
      labels: z.record(z.string(), z.string()).optional(),
      access: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let dataset = await client.getDataset(ctx.input.datasetId);

    return {
      output: {
        datasetId: dataset.datasetReference.datasetId,
        projectId: dataset.datasetReference.projectId,
        friendlyName: dataset.friendlyName,
        description: dataset.description,
        location: dataset.location,
        creationTime: dataset.creationTime,
        lastModifiedTime: dataset.lastModifiedTime,
        defaultTableExpirationMs: dataset.defaultTableExpirationMs,
        defaultPartitionExpirationMs: dataset.defaultPartitionExpirationMs,
        labels: dataset.labels,
        access: dataset.access
      },
      message: `Dataset **${ctx.input.datasetId}** in location **${dataset.location}**.`
    };
  })
  .build();

export let createDataset = SlateTool.create(spec, {
  name: 'Create Dataset',
  key: 'create_dataset',
  description: `Create a new BigQuery dataset. A dataset is a top-level container for tables, views, and routines. Once created, its location cannot be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Unique ID for the new dataset'),
      friendlyName: z.string().optional().describe('Human-readable name'),
      description: z.string().optional().describe('Description of the dataset'),
      location: z
        .string()
        .optional()
        .describe(
          'Geographic location (e.g., US, EU, us-central1). Defaults to the configured location.'
        ),
      defaultTableExpirationMs: z
        .string()
        .optional()
        .describe('Default table expiration in milliseconds'),
      defaultPartitionExpirationMs: z
        .string()
        .optional()
        .describe('Default partition expiration in milliseconds'),
      labels: z.record(z.string(), z.string()).optional().describe('Key-value labels')
    })
  )
  .output(
    z.object({
      datasetId: z.string(),
      projectId: z.string(),
      location: z.string(),
      creationTime: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let dataset = await client.createDataset({
      datasetId: ctx.input.datasetId,
      friendlyName: ctx.input.friendlyName,
      description: ctx.input.description,
      location: ctx.input.location,
      defaultTableExpirationMs: ctx.input.defaultTableExpirationMs,
      defaultPartitionExpirationMs: ctx.input.defaultPartitionExpirationMs,
      labels: ctx.input.labels
    });

    return {
      output: {
        datasetId: dataset.datasetReference.datasetId,
        projectId: dataset.datasetReference.projectId,
        location: dataset.location,
        creationTime: dataset.creationTime
      },
      message: `Dataset **${ctx.input.datasetId}** created in **${dataset.location}**.`
    };
  })
  .build();

export let updateDataset = SlateTool.create(spec, {
  name: 'Update Dataset',
  key: 'update_dataset',
  description: `Update an existing BigQuery dataset's metadata, including its friendly name, description, labels, and default expiration settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to update'),
      friendlyName: z.string().optional().describe('Updated human-readable name'),
      description: z.string().optional().describe('Updated description'),
      defaultTableExpirationMs: z
        .string()
        .optional()
        .describe('Updated default table expiration in milliseconds'),
      defaultPartitionExpirationMs: z
        .string()
        .optional()
        .describe('Updated default partition expiration in milliseconds'),
      labels: z.record(z.string(), z.string()).optional().describe('Updated key-value labels')
    })
  )
  .output(
    z.object({
      datasetId: z.string(),
      projectId: z.string(),
      lastModifiedTime: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let dataset = await client.updateDataset(ctx.input.datasetId, {
      friendlyName: ctx.input.friendlyName,
      description: ctx.input.description,
      defaultTableExpirationMs: ctx.input.defaultTableExpirationMs,
      defaultPartitionExpirationMs: ctx.input.defaultPartitionExpirationMs,
      labels: ctx.input.labels
    });

    return {
      output: {
        datasetId: dataset.datasetReference.datasetId,
        projectId: dataset.datasetReference.projectId,
        lastModifiedTime: dataset.lastModifiedTime
      },
      message: `Dataset **${ctx.input.datasetId}** updated.`
    };
  })
  .build();

export let deleteDataset = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Delete a BigQuery dataset. By default, the dataset must be empty. Set **deleteContents** to true to also delete all tables and views within it.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to delete'),
      deleteContents: z
        .boolean()
        .optional()
        .describe('If true, also deletes all tables, views, and routines in the dataset')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    await client.deleteDataset(ctx.input.datasetId, ctx.input.deleteContents);

    return {
      output: { deleted: true },
      message: `Dataset **${ctx.input.datasetId}** deleted.`
    };
  })
  .build();
