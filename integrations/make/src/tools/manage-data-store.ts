import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageDataStore = SlateTool.create(spec, {
  name: 'Manage Data Store',
  key: 'manage_data_store',
  description: `Get details, create, update, or delete a data store. Data stores persist structured data between scenario runs and enable data sharing across scenarios.`,
  instructions: [
    'For "create", provide teamId, name, dataStructureId, and maxSizeMB.',
    'For "update", provide dataStoreId and the fields to change.',
    'For "delete", provide dataStoreId and teamId.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      dataStoreId: z
        .number()
        .optional()
        .describe('Data store ID (required for get, update, delete)'),
      teamId: z.number().optional().describe('Team ID (required for create and delete)'),
      name: z.string().optional().describe('Data store name (for create/update)'),
      dataStructureId: z.number().optional().describe('Data structure ID (for create/update)'),
      maxSizeMB: z.number().optional().describe('Maximum size in MB (for create/update)')
    })
  )
  .output(
    z.object({
      dataStoreId: z.number().optional().describe('Data store ID'),
      name: z.string().optional().describe('Data store name'),
      teamId: z.number().optional().describe('Team ID'),
      records: z.number().optional().describe('Number of records'),
      size: z.number().optional().describe('Current size'),
      maxSize: z.number().optional().describe('Maximum size'),
      deleted: z.boolean().optional().describe('Whether the data store was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.dataStoreId) throw new Error('dataStoreId is required for get action');
      let result = await client.getDataStore(ctx.input.dataStoreId);
      let d = result.dataStore ?? result;
      return {
        output: {
          dataStoreId: d.id,
          name: d.name,
          teamId: d.teamId,
          records: d.records,
          size: d.size,
          maxSize: d.maxSize
        },
        message: `Data store **${d.name}** (ID: ${d.id}) — ${d.records ?? 0} records.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.teamId) throw new Error('teamId is required for create action');
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.dataStructureId)
        throw new Error('dataStructureId is required for create action');
      if (!ctx.input.maxSizeMB) throw new Error('maxSizeMB is required for create action');

      let result = await client.createDataStore({
        name: ctx.input.name,
        teamId: ctx.input.teamId,
        datastructureId: ctx.input.dataStructureId,
        maxSizeMB: ctx.input.maxSizeMB
      });
      let d = result.dataStore ?? result;
      return {
        output: {
          dataStoreId: d.id,
          name: d.name,
          teamId: d.teamId
        },
        message: `Created data store **${d.name}** (ID: ${d.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.dataStoreId) throw new Error('dataStoreId is required for update action');
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.dataStructureId !== undefined)
        updateData.datastructureId = ctx.input.dataStructureId;
      if (ctx.input.maxSizeMB !== undefined) updateData.maxSizeMB = ctx.input.maxSizeMB;

      let result = await client.updateDataStore(ctx.input.dataStoreId, updateData);
      let d = result.dataStore ?? result;
      return {
        output: {
          dataStoreId: d.id,
          name: d.name,
          teamId: d.teamId
        },
        message: `Updated data store **${d.name ?? ctx.input.dataStoreId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.dataStoreId) throw new Error('dataStoreId is required for delete action');
      if (!ctx.input.teamId) throw new Error('teamId is required for delete action');
      await client.deleteDataStore(ctx.input.dataStoreId, ctx.input.teamId, true);
      return {
        output: {
          dataStoreId: ctx.input.dataStoreId,
          deleted: true
        },
        message: `Data store ${ctx.input.dataStoreId} **deleted**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
