import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let manageSavedFilters = SlateTool.create(spec, {
  name: 'Manage Saved Filters',
  key: 'manage_saved_filters',
  description: `List, create, update, or delete saved filters in Gigasheet. Saved filters store reusable filter logic that can be applied to any sheet.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create_or_update', 'delete'])
        .describe('Saved filter action'),
      filterHandle: z
        .string()
        .optional()
        .describe('Handle of the saved filter (for get, create_or_update, delete)'),
      filterConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Filter configuration (for create_or_update)')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Saved filter operation result'),
      success: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: unknown;

    switch (ctx.input.action) {
      case 'list':
        result = await client.listSavedFilters();
        break;

      case 'get':
        if (!ctx.input.filterHandle) throw new Error('filterHandle is required for get');
        result = await client.getSavedFilter(ctx.input.filterHandle);
        break;

      case 'create_or_update':
        if (!ctx.input.filterHandle || !ctx.input.filterConfig) {
          throw new Error('filterHandle and filterConfig are required for create_or_update');
        }
        result = await client.createOrUpdateSavedFilter(
          ctx.input.filterHandle,
          ctx.input.filterConfig
        );
        break;

      case 'delete':
        if (!ctx.input.filterHandle) throw new Error('filterHandle is required for delete');
        await client.deleteSavedFilter(ctx.input.filterHandle);
        result = { deleted: true };
        break;
    }

    return {
      output: {
        result,
        success: true
      },
      message: `Saved filter **${ctx.input.action}** completed successfully.`
    };
  })
  .build();
