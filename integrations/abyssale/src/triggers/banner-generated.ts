import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let bannerGenerated = SlateTrigger.create(spec, {
  name: 'Banner Generated',
  key: 'banner_generated',
  description:
    'Triggered when a single banner has been generated. This event fires for non-API synchronous generations (e.g., from the Abyssale editor). Webhooks must be configured in the Abyssale dashboard.'
})
  .input(
    z.object({
      bannerId: z.string().describe('Generated banner UUID'),
      fileType: z.string().describe('File type'),
      fileUrl: z.string().describe('URL where the file is stored'),
      cdnUrl: z.string().describe('CDN URL'),
      filename: z.string().describe('Generated filename'),
      formatName: z.string().describe('Format name'),
      width: z.number().describe('Width in pixels'),
      height: z.number().describe('Height in pixels'),
      templateId: z.string().describe('Template UUID'),
      templateName: z.string().describe('Template name'),
      templateCreatedAt: z.number().describe('Template creation timestamp'),
      templateUpdatedAt: z.number().describe('Template update timestamp')
    })
  )
  .output(
    z.object({
      bannerId: z.string().describe('Generated banner UUID'),
      fileType: z.string().describe('File type (jpeg, png, mp4, gif, etc.)'),
      fileUrl: z.string().describe('URL where the file is stored'),
      cdnUrl: z.string().describe('CDN URL for high-speed access'),
      filename: z.string().describe('Generated filename'),
      formatName: z.string().describe('Format name as defined in the template'),
      width: z.number().describe('Width in pixels'),
      height: z.number().describe('Height in pixels'),
      templateId: z.string().describe('Template UUID'),
      templateName: z.string().describe('Template name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            bannerId: data.id,
            fileType: data.file?.type || '',
            fileUrl: data.file?.url || '',
            cdnUrl: data.file?.cdn_url || '',
            filename: data.file?.filename || '',
            formatName: data.format?.id || '',
            width: data.format?.width || 0,
            height: data.format?.height || 0,
            templateId: data.template?.id || '',
            templateName: data.template?.name || '',
            templateCreatedAt: data.template?.created_at || 0,
            templateUpdatedAt: data.template?.updated_at || 0
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'banner.generated',
        id: ctx.input.bannerId,
        output: {
          bannerId: ctx.input.bannerId,
          fileType: ctx.input.fileType,
          fileUrl: ctx.input.fileUrl,
          cdnUrl: ctx.input.cdnUrl,
          filename: ctx.input.filename,
          formatName: ctx.input.formatName,
          width: ctx.input.width,
          height: ctx.input.height,
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName
        }
      };
    }
  })
  .build();
