import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient, fileMimeType } from '../lib/client';
import { spec } from '../spec';

export let downloadTemplate = SlateTool.create(spec, {
  name: 'Download Template',
  key: 'download_template',
  description:
    'Provides a downloadable template source file, PDF preview, or PNG thumbnail. Use list_templates to discover template IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      templateId: z
        .string()
        .min(1)
        .describe('Template ID. Use list_templates to discover templates.'),
      variant: z
        .enum(['original', 'preview', 'thumbnail'])
        .default('original')
        .describe('Original source file, PDF preview, or PNG image of the first page.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID.'),
      name: z.string().describe('Template name.'),
      filename: z.string().describe('Suggested filename for the requested file.'),
      format: z.string().describe('Requested file format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({ token: ctx.auth.token, region: ctx.config.region });
    let template = await client.getTemplate(ctx.input.templateId);
    let variant = ctx.input.variant;
    let url =
      variant === 'preview'
        ? template.preview_uri
        : variant === 'thumbnail'
          ? template.image_uri
          : template.template_uri;
    let format =
      variant === 'preview' ? '.pdf' : variant === 'thumbnail' ? '.png' : template.format;
    let filename =
      variant === 'original'
        ? template.filename
        : `${template.filename.replace(/\.[^.]+$/, '')}${format}`;
    await ctx.addAttachment({ type: 'url', url, mimeType: fileMimeType(format) });
    return {
      output: { templateId: template.id, name: template.name, filename, format },
      message: `Prepared **${filename}** for download.`
    };
  })
  .build();
