import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let manageDataset = SlateTool.create(spec, {
  name: 'Create, Update, or Delete Dataset',
  key: 'manage_dataset',
  description: `Manage datasets in the AI Catalog. Create a new dataset from a URL, update an existing dataset's name, or delete a dataset.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the dataset'),
      datasetId: z
        .string()
        .optional()
        .describe('ID of the dataset (required for update/delete)'),
      url: z.string().optional().describe('URL to create dataset from (required for create)'),
      name: z.string().optional().describe('Name for the dataset (used for create/update)'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Categories for the dataset (used for create)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      datasetId: z.string().optional().describe('ID of the affected dataset'),
      name: z.string().optional().describe('Name of the dataset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.url) {
        throw new Error('URL is required to create a dataset');
      }
      let dataset = await client.createDatasetFromUrl({
        url: ctx.input.url,
        categories: ctx.input.categories
      });

      return {
        output: {
          success: true,
          datasetId: dataset.datasetId || dataset.id,
          name: dataset.name || ctx.input.name
        },
        message: `Dataset created from URL. ID: **${dataset.datasetId || dataset.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.datasetId) {
        throw new Error('datasetId is required to delete a dataset');
      }
      await client.deleteDataset(ctx.input.datasetId);
      return {
        output: {
          success: true,
          datasetId: ctx.input.datasetId
        },
        message: `Dataset **${ctx.input.datasetId}** has been deleted.`
      };
    }

    // update
    if (!ctx.input.datasetId) {
      throw new Error('datasetId is required to update a dataset');
    }
    let updated = await client.updateDataset(ctx.input.datasetId, {
      name: ctx.input.name
    });

    return {
      output: {
        success: true,
        datasetId: ctx.input.datasetId,
        name: updated.name || ctx.input.name
      },
      message: `Dataset **${ctx.input.datasetId}** updated.`
    };
  })
  .build();
