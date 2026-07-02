import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let manageDataset = SlateTool.create(spec, {
  name: 'Manage Dataset',
  key: 'manage_dataset',
  description: `Create, update, delete, or upload a new version to a dataset. Datasets are versioned, structured data (CSV/TSV samplesheets) used as pipeline inputs.`,
  instructions: [
    'To **create** a dataset, provide a name and optionally a description.',
    'To **update**, provide the datasetId and any fields to change.',
    'To **upload** a new version, provide the datasetId and csvContent (or tsvContent).',
    'To **delete**, provide the datasetId and set action to "delete".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'upload_version'])
        .describe('Action to perform'),
      datasetId: z
        .string()
        .optional()
        .describe('Dataset ID (required for update, delete, upload_version)'),
      name: z.string().optional().describe('Dataset name (required for create)'),
      description: z.string().optional().describe('Dataset description'),
      csvContent: z
        .string()
        .optional()
        .describe('CSV content to upload as a new dataset version'),
      tsvContent: z
        .string()
        .optional()
        .describe('TSV content to upload as a new dataset version')
    })
  )
  .output(
    z.object({
      datasetId: z.string().optional().describe('Dataset ID'),
      name: z.string().optional().describe('Dataset name'),
      description: z.string().optional().describe('Dataset description'),
      deleted: z.boolean().optional().describe('Whether the dataset was deleted'),
      versionUploaded: z.boolean().optional().describe('Whether a new version was uploaded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a dataset');
      let dataset = await client.createDataset({
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          datasetId: dataset.id,
          name: dataset.name,
          description: dataset.description
        },
        message: `Dataset **${dataset.name || ctx.input.name}** created.`
      };
    }

    if (!ctx.input.datasetId) throw new Error('datasetId is required for this action');

    if (ctx.input.action === 'delete') {
      await client.deleteDataset(ctx.input.datasetId);
      return {
        output: { datasetId: ctx.input.datasetId, deleted: true },
        message: `Dataset **${ctx.input.datasetId}** deleted.`
      };
    }

    if (ctx.input.action === 'upload_version') {
      let content = ctx.input.csvContent || ctx.input.tsvContent;
      if (!content)
        throw new Error('csvContent or tsvContent is required to upload a version');
      let mediaType = ctx.input.tsvContent ? 'text/tab-separated-values' : 'text/csv';
      await client.uploadDatasetVersion(ctx.input.datasetId, content, mediaType);
      return {
        output: { datasetId: ctx.input.datasetId, versionUploaded: true },
        message: `New version uploaded to dataset **${ctx.input.datasetId}**.`
      };
    }

    // update
    await client.updateDataset(ctx.input.datasetId, {
      name: ctx.input.name,
      description: ctx.input.description
    });
    return {
      output: {
        datasetId: ctx.input.datasetId,
        name: ctx.input.name,
        description: ctx.input.description
      },
      message: `Dataset **${ctx.input.datasetId}** updated.`
    };
  })
  .build();
