import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let manageDatasets = SlateTool.create(spec, {
  name: 'Manage Datasets',
  key: 'manage_datasets',
  description: `List, create, or delete datasets in a Sanity project. Datasets are collections of JSON documents that hold your content. Each project can have multiple datasets (e.g., "production", "staging").`,
  instructions: [
    'Use action "list" to see all datasets in the project.',
    'Use action "create" with a datasetName to create a new dataset.',
    'Use action "delete" with a datasetName to remove a dataset. This is destructive and cannot be undone.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('The operation to perform.'),
      datasetName: z
        .string()
        .optional()
        .describe('Name of the dataset. Required for "create" and "delete" actions.'),
      aclMode: z
        .enum(['public', 'private', 'custom'])
        .optional()
        .describe('Access control mode for the dataset. Only used when creating a dataset.')
    })
  )
  .output(
    z.object({
      datasets: z
        .array(
          z
            .object({
              name: z.string().describe('Dataset name.'),
              aclMode: z.string().optional().describe('Access control mode.')
            })
            .passthrough()
        )
        .optional()
        .describe('List of datasets (for "list" action).'),
      created: z
        .object({
          datasetName: z.string().describe('Name of the created dataset.'),
          aclMode: z
            .string()
            .optional()
            .describe('Access control mode of the created dataset.')
        })
        .optional()
        .describe('Created dataset details (for "create" action).'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the dataset was deleted (for "delete" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.action === 'list') {
      let datasets = await client.listDatasets();
      return {
        output: { datasets },
        message: `Found ${datasets.length} dataset(s) in the project.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.datasetName) {
        throw new Error('datasetName is required for "create" action.');
      }
      await client.createDataset(ctx.input.datasetName, ctx.input.aclMode);
      return {
        output: {
          created: {
            datasetName: ctx.input.datasetName,
            aclMode: ctx.input.aclMode
          }
        },
        message: `Created dataset **${ctx.input.datasetName}**${ctx.input.aclMode ? ` with ACL mode "${ctx.input.aclMode}"` : ''}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.datasetName) {
        throw new Error('datasetName is required for "delete" action.');
      }
      await client.deleteDataset(ctx.input.datasetName);
      return {
        output: { deleted: true },
        message: `Deleted dataset **${ctx.input.datasetName}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
