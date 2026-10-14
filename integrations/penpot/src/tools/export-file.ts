import { SlateTool } from 'slates';
import { z } from 'zod';
import { makeClient } from '../lib/helpers';
import { spec } from '../spec';

export let exportFileTool = SlateTool.create(spec, {
  name: 'Export File',
  key: 'export_file',
  description: `Export a design file in Penpot's native .penpot binary format. Can optionally include linked libraries and embed assets for standalone import.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to export'),
      includeLibraries: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include linked shared libraries in the export'),
      embedAssets: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to embed all assets directly in the export file')
    })
  )
  .output(
    z.object({
      exportResult: z.any().describe('Export result data, may include a download URI')
    })
  )
  .handleInvocation(async ctx => {
    let client = makeClient(ctx);
    let reference = {
      fileId: ctx.input.fileId,
      includeLibraries: ctx.input.includeLibraries ?? false,
      embedAssets: ctx.input.embedAssets ?? false
    };
    let result = await client.exportBinfile(
      reference.fileId,
      reference.includeLibraries,
      reference.embedAssets
    );
    let filename = `${ctx.input.fileId}.penpot`;
    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      headers: { Authorization: `Token ${ctx.auth.token}` },
      mimeType: 'application/zip',
      filename,
      refreshReference: reference,
      refreshAt: result.expiresAt
    });

    return {
      output: { exportResult: result.rawResponse },
      message: `Exported file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
