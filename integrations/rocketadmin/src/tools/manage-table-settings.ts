import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageTableSettings = SlateTool.create(spec, {
  name: 'Manage Table Settings',
  key: 'manage_table_settings',
  description: `Get, create, update, or delete display settings for a table. Table settings control how data is displayed including column ordering, visibility, search fields, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z.string().describe('Name of the table'),
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Table settings to create or update')
    })
  )
  .output(
    z.object({
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Current table settings'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, connectionId, tableName, settings } = ctx.input;

    if (action === 'get') {
      let result = await client.getTableSettings(connectionId, tableName);
      return {
        output: { settings: result, success: true },
        message: `Retrieved settings for table **${tableName}**.`
      };
    }

    if (action === 'create') {
      if (!settings) throw new Error('settings is required for creating table settings');
      let result = await client.createTableSettings(connectionId, tableName, settings);
      return {
        output: { settings: result, success: true },
        message: `Settings created for table **${tableName}**.`
      };
    }

    if (action === 'update') {
      if (!settings) throw new Error('settings is required for updating table settings');
      let result = await client.updateTableSettings(connectionId, tableName, settings);
      return {
        output: { settings: result, success: true },
        message: `Settings updated for table **${tableName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteTableSettings(connectionId, tableName);
      return {
        output: { success: true },
        message: `Settings deleted for table **${tableName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
