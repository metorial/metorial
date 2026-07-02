import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDatasetTool = SlateTool.create(spec, {
  name: 'Manage Dataset',
  key: 'manage_dataset',
  description: `Create, update, delete, or fetch datasets. Datasets are structured collections of knowledge that bots use to generate informed responses. Manage both the dataset container and individual records within it.`,
  instructions: [
    'To manage records within a dataset, use the recordAction field.',
    'Search records using semantic similarity with the searchQuery field.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'fetch'])
        .describe('Action to perform on the dataset'),
      datasetId: z
        .string()
        .optional()
        .describe('Dataset ID (required for update, delete, fetch, and record actions)'),
      name: z.string().optional().describe('Dataset name'),
      description: z.string().optional().describe('Dataset description'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata'),
      recordAction: z
        .enum(['create', 'update', 'delete', 'fetch', 'list', 'search'])
        .optional()
        .describe('Action to perform on a record within the dataset'),
      recordId: z.string().optional().describe('Record ID (for record update, delete, fetch)'),
      recordText: z
        .string()
        .optional()
        .describe('Record text content (for record create/update)'),
      searchQuery: z.string().optional().describe('Semantic search query (for record search)')
    })
  )
  .output(
    z.object({
      datasetId: z.string().optional().describe('Dataset ID'),
      name: z.string().optional().describe('Dataset name'),
      description: z.string().optional().describe('Dataset description'),
      recordId: z.string().optional().describe('Record ID (for record actions)'),
      recordText: z.string().optional().describe('Record text (for record fetch)'),
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of records (for list/search)'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let {
      action,
      datasetId,
      name,
      description,
      meta,
      recordAction,
      recordId,
      recordText,
      searchQuery
    } = ctx.input;

    // Record-level actions
    if (recordAction && datasetId) {
      if (recordAction === 'create') {
        if (!recordText) throw new Error('recordText is required to create a record');
        let result = await client.createRecord(datasetId, { text: recordText, meta });
        return {
          output: { datasetId, recordId: result.id, recordText },
          message: `Record created in dataset **${datasetId}**.`
        };
      }
      if (recordAction === 'fetch') {
        if (!recordId) throw new Error('recordId is required to fetch a record');
        let result = await client.fetchRecord(datasetId, recordId);
        return {
          output: { datasetId, recordId: result.id, recordText: result.text },
          message: `Fetched record **${recordId}** from dataset **${datasetId}**.`
        };
      }
      if (recordAction === 'update') {
        if (!recordId) throw new Error('recordId is required to update a record');
        let updateData: Record<string, any> = {};
        if (recordText !== undefined) updateData.text = recordText;
        if (meta !== undefined) updateData.meta = meta;
        await client.updateRecord(datasetId, recordId, updateData);
        return {
          output: { datasetId, recordId },
          message: `Record **${recordId}** updated in dataset **${datasetId}**.`
        };
      }
      if (recordAction === 'delete') {
        if (!recordId) throw new Error('recordId is required to delete a record');
        await client.deleteRecord(datasetId, recordId);
        return {
          output: { datasetId, recordId },
          message: `Record **${recordId}** deleted from dataset **${datasetId}**.`
        };
      }
      if (recordAction === 'list') {
        let result = await client.listRecords(datasetId);
        return {
          output: { datasetId, records: result.items },
          message: `Found **${result.items.length}** records in dataset **${datasetId}**.`
        };
      }
      if (recordAction === 'search') {
        if (!searchQuery) throw new Error('searchQuery is required for record search');
        let result = await client.searchRecords(datasetId, searchQuery);
        let items = result.items || result.records || [];
        return {
          output: { datasetId, records: items },
          message: `Search returned **${items.length}** results in dataset **${datasetId}**.`
        };
      }
    }

    // Dataset-level actions
    if (action === 'create') {
      let result = await client.createDataset({ name, description, meta });
      return {
        output: {
          datasetId: result.id,
          name: result.name,
          description: result.description,
          createdAt: result.createdAt
        },
        message: `Dataset **${result.name || result.id}** created.`
      };
    }

    if (action === 'fetch') {
      if (!datasetId) throw new Error('datasetId is required for fetch');
      let result = await client.fetchDataset(datasetId);
      return {
        output: {
          datasetId: result.id,
          name: result.name,
          description: result.description,
          createdAt: result.createdAt
        },
        message: `Fetched dataset **${result.name || result.id}**.`
      };
    }

    if (action === 'update') {
      if (!datasetId) throw new Error('datasetId is required for update');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (meta !== undefined) updateData.meta = meta;
      await client.updateDataset(datasetId, updateData);
      return {
        output: { datasetId, name, description },
        message: `Dataset **${datasetId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!datasetId) throw new Error('datasetId is required for delete');
      await client.deleteDataset(datasetId);
      return {
        output: { datasetId },
        message: `Dataset **${datasetId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
