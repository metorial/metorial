import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExport = SlateTool.create(spec, {
  name: 'Manage Export',
  key: 'manage_export',
  description: `Get, create, update, clone, or delete an export. Exports extract data from an application and can run standalone via the API or in the context of a flow.
Use **action** to specify the operation. For "create" and "update", provide the export configuration in **exportData**.`,
  instructions: [
    'The export data structure varies by type and connected application. Refer to the Celigo API docs for type-specific fields.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'clone', 'delete'])
        .describe('The operation to perform'),
      exportId: z
        .string()
        .optional()
        .describe('ID of the export (required for get, update, clone, delete)'),
      exportData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Export configuration data (required for create and update)')
    })
  )
  .output(
    z.object({
      exportId: z.string().optional().describe('ID of the affected export'),
      name: z.string().optional().describe('Name of the export'),
      type: z.string().optional().describe('Type of the export'),
      deleted: z.boolean().optional().describe('Whether the export was deleted'),
      rawResult: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, exportId, exportData } = ctx.input;

    if (action !== 'create' && !exportId) {
      throw new Error('exportId is required for this action');
    }

    let result: any;
    let message: string;

    switch (action) {
      case 'get': {
        result = await client.getExport(exportId!);
        message = `Retrieved export **${result.name || result._id}**.`;
        break;
      }
      case 'create': {
        if (!exportData) throw new Error('exportData is required for create');
        result = await client.createExport(exportData);
        message = `Created export **${result.name || result._id}**.`;
        break;
      }
      case 'update': {
        if (!exportData) throw new Error('exportData is required for update');
        result = await client.updateExport(exportId!, exportData);
        message = `Updated export **${result.name || result._id}**.`;
        break;
      }
      case 'clone': {
        result = await client.cloneExport(exportId!);
        message = `Cloned export **${exportId}** → new export **${result._id}**.`;
        break;
      }
      case 'delete': {
        await client.deleteExport(exportId!);
        return {
          output: {
            exportId: exportId!,
            deleted: true
          },
          message: `Deleted export **${exportId}**.`
        };
      }
    }

    return {
      output: {
        exportId: result?._id || exportId,
        name: result?.name,
        type: result?.type,
        rawResult: result
      },
      message
    };
  })
  .build();
