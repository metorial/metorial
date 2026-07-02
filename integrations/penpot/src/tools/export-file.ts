import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.exportBinfile(
      ctx.input.fileId,
      ctx.input.includeLibraries ?? false,
      ctx.input.embedAssets ?? false
    );

    return {
      output: { exportResult: result },
      message: `Exported file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
