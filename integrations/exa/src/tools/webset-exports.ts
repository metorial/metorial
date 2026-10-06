import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

export let createExportTool = SlateTool.create(spec, {
  name: 'Export Webset',
  key: 'export_webset',
  description: `Request the historical Webset export route for CSV, JSON or XLSX. This compatibility route is not corroborated by the current public API or SDK; confirm availability with Exa before use. The export runs asynchronously — use the returned export ID to check completion status.`,
  tags: {
    readOnly: false
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
    let client = new ExaClient(ctx.auth.token, ctx.input);
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
  description: `Read historical Webset export metadata. This compatibility route is unverified in current public documentation; no file availability or renewal is promised. A returned URL is legacy metadata.`,
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
        .describe('Historical URL field; currently omitted. Use Exa directly for files.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token, ctx.input);
    let result = await client.getExport(ctx.input.websetId, ctx.input.exportId);

    return {
      output: {
        exportId: result.id,
        status: result.status,
        downloadUrl: undefined
      },
      message: `Export **${result.id}** is **${result.status}**.${result.downloadUrl ? ' A legacy file URL was returned, but its ownership, expiry and delivery cannot be verified; use Exa directly.' : ''}`
    };
  })
  .build();
