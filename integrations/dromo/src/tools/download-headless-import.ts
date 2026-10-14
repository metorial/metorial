import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { createDownloadAttachment } from '../lib/files';
import { spec } from '../spec';

export let downloadHeadlessImport = SlateTool.create(spec, {
  name: 'Download Headless Import Results',
  key: 'download_headless_import',
  description:
    'Downloads the processed JSON data for a successful headless import. Use get_headless_import to check status.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      importId: z
        .string()
        .describe('Headless import ID from create_headless_import or list_headless_imports')
    })
  )
  .output(z.object({ importId: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let { url } = await client.getHeadlessImportDownloadUrl(ctx.input.importId);
    await ctx.addAttachment(createDownloadAttachment(url, 'headless', ctx.input.importId));
    return {
      output: { importId: ctx.input.importId, mimeType: 'application/json' },
      message: `Prepared headless import **${ctx.input.importId}** results for download.`
    };
  })
  .build();
