import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageDataExports = SlateTool.create(spec, {
  name: 'Manage Data Exports',
  key: 'manage_data_exports',
  description: `List existing data exports or request a new full data export of all coding activity. Exports are generated asynchronously and a download URL is provided upon completion.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create'])
        .describe('"list" to see existing exports, "create" to request a new export'),
      exportType: z
        .enum(['daily', 'heartbeats'])
        .optional()
        .default('daily')
        .describe(
          'Export format: "daily" for daily summaries, "heartbeats" for raw heartbeat data (only used with "create")'
        )
    })
  )
  .output(
    z.object({
      exports: z
        .array(
          z
            .object({
              exportId: z.string().describe('Export ID'),
              type: z.string().optional().describe('Export type'),
              status: z
                .string()
                .optional()
                .describe('Export status (pending, processing, completed)'),
              percentComplete: z.number().optional().describe('Completion percentage'),
              downloadUrl: z
                .string()
                .optional()
                .describe('URL to download the export (when complete)'),
              createdAt: z.string().optional().describe('When the export was requested'),
              expiresAt: z.string().optional().describe('When the download URL expires')
            })
            .passthrough()
        )
        .optional()
        .describe('List of data exports'),
      created: z.boolean().optional().describe('Whether a new export was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.requestDataExport(ctx.input.exportType);

      return {
        output: {
          created: true,
          exports: result.data
            ? [
                {
                  exportId: result.data.id ?? '',
                  type: result.data.type,
                  status: result.data.status || 'pending',
                  percentComplete: result.data.percent_complete,
                  downloadUrl: result.data.download_url,
                  createdAt: result.data.created_at,
                  expiresAt: result.data.expires_at
                }
              ]
            : []
        },
        message: `Requested new **${ctx.input.exportType}** data export. It will be processed in the background.`
      };
    }

    let exports = await client.getDataExports();

    let mapped = (exports || []).map((e: any) => ({
      exportId: e.id ?? '',
      type: e.type,
      status: e.status,
      percentComplete: e.percent_complete,
      downloadUrl: e.download_url,
      createdAt: e.created_at,
      expiresAt: e.expires_at
    }));

    return {
      output: {
        exports: mapped,
        created: false
      },
      message: `Found **${mapped.length}** data export(s).`
    };
  })
  .build();
