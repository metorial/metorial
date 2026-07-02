import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

export let createExportTool = SlateTool.create(spec, {
  name: 'Export Webset',
  key: 'export_webset',
  description: `Export all items from a Webset to CSV, JSON, or XLSX format. The export runs asynchronously — use the returned export ID to check completion status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID to export'),
      format: z.enum(['csv', 'json', 'xlsx']).describe('Export format')
    })
  )
  .output(
    z.object({
      exportId: z.string().describe('Export job identifier'),
      status: z.string().describe('Export status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.createExport(ctx.input.websetId, {
      format: ctx.input.format
    });

    return {
      output: {
        exportId: result.id,
        status: result.status
      },
      message: `Started **${ctx.input.format.toUpperCase()}** export **${result.id}** for Webset **${ctx.input.websetId}**.`
    };
  })
  .build();

export let getExportTool = SlateTool.create(spec, {
  name: 'Get Export Status',
  key: 'get_export_status',
  description: `Check the status of a Webset export job. When completed, returns a download URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      websetId: z.string().describe('The Webset ID'),
      exportId: z.string().describe('The export ID to check')
    })
  )
  .output(
    z.object({
      exportId: z.string().describe('Export job identifier'),
      status: z.string().describe('Export status'),
      downloadUrl: z
        .string()
        .optional()
        .describe('URL to download the export file (when completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);
    let result = await client.getExport(ctx.input.websetId, ctx.input.exportId);

    return {
      output: {
        exportId: result.id,
        status: result.status,
        downloadUrl: result.downloadUrl
      },
      message: `Export **${result.id}** is **${result.status}**.${result.downloadUrl ? ' Download is ready.' : ''}`
    };
  })
  .build();
