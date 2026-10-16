import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description:
    'Check a Felt data source and its discovered datasets. Call list_sources to find source IDs. After creating, updating, or syncing a source, poll until syncStatus is completed or failed.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ sourceId: z.string().describe('Source ID from list_sources or manage_source') })
  )
  .output(
    z.object({
      sourceId: z.string(),
      name: z.string().optional(),
      syncStatus: z.string().optional(),
      automaticSync: z.string().optional(),
      connectionType: z.string().optional(),
      lastSyncedAt: z
        .number()
        .nullable()
        .optional()
        .describe('Provider Unix timestamp, without conversion'),
      datasets: z
        .array(
          z.object({
            id: z.string().optional(),
            name: z.string().optional(),
            description: z.string().nullable().optional(),
            geometry_type: z.string().optional(),
            inspection_status: z.string().optional(),
            type: z.string().optional(),
            created_at: z.number().optional(),
            updated_at: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let source = await new Client({ token: ctx.auth.token }).getSource(ctx.input.sourceId);
    return {
      output: {
        sourceId: source.id,
        name: source.name,
        syncStatus: source.sync_status,
        automaticSync: source.automatic_sync,
        connectionType: source.connection?.type,
        lastSyncedAt: source.last_synced_at,
        datasets: source.datasets
      },
      message: `Retrieved source ${source.name ?? source.id}; sync status: ${source.sync_status ?? 'not reported'}.`
    };
  })
  .build();
