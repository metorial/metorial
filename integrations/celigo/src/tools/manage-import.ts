import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageImport = SlateTool.create(spec, {
  name: 'Manage Import',
  key: 'manage_import',
  description: `Get, create, update, clone, or delete an import. Imports map and insert data into an application and can run standalone via the API or in the context of a flow.
Use **action** to specify the operation. For "create" and "update", provide the import configuration in **importData**.`,
  instructions: [
    'The import data structure varies by type and connected application. Refer to the Celigo API docs for type-specific fields.',
    'Common fields include: name, _connectionId, mapping, and application-specific settings.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'clone', 'delete'])
        .describe('The operation to perform'),
      importId: z
        .string()
        .optional()
        .describe('ID of the import (required for get, update, clone, delete)'),
      importData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Import configuration data (required for create and update)')
    })
  )
  .output(
    z.object({
      importId: z.string().optional().describe('ID of the affected import'),
      name: z.string().optional().describe('Name of the import'),
      deleted: z.boolean().optional().describe('Whether the import was deleted'),
      rawResult: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, importId, importData } = ctx.input;

    if (action !== 'create' && !importId) {
      throw new Error('importId is required for this action');
    }

    let result: any;
    let message: string;

    switch (action) {
      case 'get': {
        result = await client.getImport(importId!);
        message = `Retrieved import **${result.name || result._id}**.`;
        break;
      }
      case 'create': {
        if (!importData) throw new Error('importData is required for create');
        result = await client.createImport(importData);
        message = `Created import **${result.name || result._id}**.`;
        break;
      }
      case 'update': {
        if (!importData) throw new Error('importData is required for update');
        result = await client.updateImport(importId!, importData);
        message = `Updated import **${result.name || result._id}**.`;
        break;
      }
      case 'clone': {
        result = await client.cloneImport(importId!);
        message = `Cloned import **${importId}** → new import **${result._id}**.`;
        break;
      }
      case 'delete': {
        await client.deleteImport(importId!);
        return {
          output: {
            importId: importId!,
            deleted: true
          },
          message: `Deleted import **${importId}**.`
        };
      }
    }

    return {
      output: {
        importId: result?._id || importId,
        name: result?.name,
        rawResult: result
      },
      message
    };
  })
  .build();
