import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadTemplate = SlateTool.create(spec, {
  name: 'Download Template',
  key: 'download_template',
  description:
    'Download the original document template stored in Docmosis Cloud. Use list_templates to discover its path.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateName: z.string().min(1).describe('Template path returned by list_templates')
    })
  )
  .output(
    z.object({
      succeeded: z.boolean(),
      templateName: z.string(),
      filename: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.downloadTemplate(ctx.input.templateName);
    let filename = ctx.input.templateName.split('/').pop() || 'template';
    let mimeType = result.file.headers.get('content-type') || 'application/octet-stream';
    await ctx.addAttachment({ type: 'content', content: result.file, filename });
    return {
      output: { succeeded: true, templateName: ctx.input.templateName, filename, mimeType },
      message: `Prepared **${filename}** for download.`
    };
  })
  .build();
