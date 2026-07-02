import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDefaultDataView = SlateTool.create(spec, {
  name: 'Manage Default Data View',
  key: 'manage_default_data_view',
  description: `Get, set, or unset the default Kibana data view for the current space. The default data view is used when no specific data view is selected.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'set', 'unset']).describe('Action to perform'),
      dataViewId: z
        .string()
        .optional()
        .describe('Data view ID to set as default. Required for set.'),
      force: z
        .boolean()
        .optional()
        .describe('Overwrite an existing default data view when setting the default')
    })
  )
  .output(
    z.object({
      defaultDataViewId: z
        .string()
        .nullable()
        .optional()
        .describe('Current default data view ID, or null when unset'),
      acknowledged: z.boolean().optional().describe('Whether Kibana acknowledged the change')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, dataViewId, force } = ctx.input;

    if (action === 'get') {
      let result = await client.getDefaultDataView();
      return {
        output: { defaultDataViewId: result.data_view_id ?? null },
        message: result.data_view_id
          ? `Default data view is \`${result.data_view_id}\`.`
          : 'No default data view is configured.'
      };
    }

    if (action === 'set') {
      if (!dataViewId) {
        throw kibanaServiceError('dataViewId is required for set action');
      }

      let result = await client.setDefaultDataView(dataViewId, force);
      return {
        output: {
          defaultDataViewId: dataViewId,
          acknowledged: result.acknowledged
        },
        message: `Set default data view to \`${dataViewId}\`.`
      };
    }

    if (action === 'unset') {
      let result = await client.setDefaultDataView(null, force);
      return {
        output: {
          defaultDataViewId: null,
          acknowledged: result.acknowledged
        },
        message: 'Unset the default data view.'
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();
