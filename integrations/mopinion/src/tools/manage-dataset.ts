import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let manageDataset = SlateTool.create(spec, {
  name: 'Manage Dataset',
  key: 'manage_dataset',
  description: `Create, update, or delete a Mopinion dataset. Datasets belong to reports and represent structured collections of feedback data. For creating, provide a name and reportId. For updating, provide the dataset ID and fields to change. For deleting, provide the dataset ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the dataset'),
      datasetId: z.number().optional().describe('Dataset ID (required for update and delete)'),
      reportId: z.number().optional().describe('Parent report ID (required for create)'),
      name: z
        .string()
        .optional()
        .describe('Dataset name (required for create, optional for update)'),
      description: z.string().optional().describe('Dataset description'),
      dataSource: z.string().optional().describe('Data source identifier')
    })
  )
  .output(
    z.object({
      datasetId: z.number().optional().describe('ID of the affected dataset'),
      name: z.string().optional().describe('Dataset name'),
      success: z.boolean().describe('Whether the operation succeeded'),
      result: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    let { action, datasetId, reportId, name, description, dataSource } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a dataset');
      if (!reportId) throw new Error('reportId is required when creating a dataset');

      let result = await client.addDataset({ name, reportId, description, dataSource });
      let created = result.data || result;

      return {
        output: {
          datasetId: created.id,
          name: created.name || name,
          success: true,
          result: created
        },
        message: `Created dataset **${name}**${created.id ? ` (ID: ${created.id})` : ''} in report ${reportId}.`
      };
    }

    if (action === 'update') {
      if (!datasetId) throw new Error('datasetId is required when updating a dataset');

      let updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (dataSource !== undefined) updateData.dataSource = dataSource;

      let result = await client.updateDataset(datasetId, updateData);
      let updated = result.data || result;

      return {
        output: {
          datasetId,
          name: updated.name || name,
          success: true,
          result: updated
        },
        message: `Updated dataset **${datasetId}**.`
      };
    }

    if (action === 'delete') {
      if (!datasetId) throw new Error('datasetId is required when deleting a dataset');

      let result = await client.deleteDataset(datasetId);

      return {
        output: {
          datasetId,
          success: true,
          result
        },
        message: `Deleted dataset **${datasetId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
