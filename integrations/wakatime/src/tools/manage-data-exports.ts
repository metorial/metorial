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
        ),
      emailWhenFinished: z
        .boolean()
        .optional()
        .describe('Whether to email when a new export completes (defaults to true)')
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
    let client = new WakaTimeClient(ctx.auth);

    let created = ctx.input.action === 'create';
    let exports = created
      ? [
          (await client.requestDataExport(ctx.input.exportType, ctx.input.emailWhenFinished))
            .data
        ]
      : await client.getDataExports();

    let mapped = (exports || []).map(e => ({
      exportId: e.id ?? '',
      type: e.type ?? undefined,
      status: e.status ?? undefined,
      percentComplete: e.percent_complete ?? undefined,
      downloadUrl: e.download_url ?? undefined,
      createdAt: e.created_at ?? undefined,
      expiresAt: e.expires ?? undefined
    }));

    let availableDownloads = 0;
    for (let dataExport of mapped) {
      if (!dataExport.downloadUrl || dataExport.percentComplete !== 100) continue;
      let expiresMs = dataExport.expiresAt ? Date.parse(dataExport.expiresAt) : undefined;
      if (expiresMs !== undefined && (!Number.isFinite(expiresMs) || expiresMs <= Date.now()))
        continue;
      await ctx.addAttachment({
        type: 'url',
        url: dataExport.downloadUrl,
        ...(expiresMs !== undefined
          ? {
              refreshReference: { exportId: dataExport.exportId },
              refreshAt: new Date(expiresMs).toISOString()
            }
          : {})
      });
      availableDownloads++;
    }

    return {
      output: {
        exports: mapped,
        created
      },
      message: created
        ? `Requested new **${ctx.input.exportType}** data export. Call this tool with action "list" after processing completes to download it.`
        : `Found **${mapped.length}** data export(s), with **${availableDownloads}** completed export(s) available for download.`
    };
  })
  .build();
