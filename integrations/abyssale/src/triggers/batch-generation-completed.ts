import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let bannerSchema = z.object({
  bannerId: z.string().describe('Generated banner UUID'),
  fileType: z.string().describe('File type'),
  fileUrl: z.string().describe('URL where the file is stored'),
  cdnUrl: z.string().describe('CDN URL'),
  filename: z.string().describe('Generated filename'),
  formatName: z.string().describe('Format name'),
  width: z.number().describe('Width in pixels'),
  height: z.number().describe('Height in pixels'),
  templateId: z.string().describe('Template UUID'),
  templateName: z.string().describe('Template name')
});

let errorSchema = z.object({
  templateFormatName: z.string().describe('Format name that failed'),
  reason: z.string().describe('Error description')
});

export let batchGenerationCompleted = SlateTrigger.create(spec, {
  name: 'Batch Generation Completed',
  key: 'batch_generation_completed',
  description:
    'Triggered when an asynchronous batch generation request has completed. Includes all successfully generated banners and any errors for formats that failed. This is the primary event for tracking multi-format generation jobs. Webhooks must be configured in the Abyssale dashboard or via callback_url.'
})
  .input(
    z.object({
      generationRequestId: z.string().describe('Generation request UUID'),
      banners: z.array(
        z.object({
          id: z.string(),
          file: z.object({
            type: z.string(),
            url: z.string(),
            cdn_url: z.string(),
            filename: z.string()
          }),
          format: z.object({
            id: z.string(),
            width: z.number(),
            height: z.number()
          }),
          template: z.object({
            id: z.string(),
            name: z.string(),
            created_at: z.number(),
            updated_at: z.number()
          })
        })
      ),
      errors: z.array(
        z.object({
          template_format_name: z.string(),
          reason: z.string()
        })
      )
    })
  )
  .output(
    z.object({
      generationRequestId: z.string().describe('Generation request UUID'),
      banners: z.array(bannerSchema).describe('Successfully generated banners'),
      errors: z.array(errorSchema).describe('Errors for formats that failed generation'),
      totalGenerated: z.number().describe('Number of banners successfully generated'),
      totalErrors: z.number().describe('Number of formats that failed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            generationRequestId: data.id || '',
            banners: data.banners || [],
            errors: data.errors || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let banners = ctx.input.banners.map(b => ({
        bannerId: b.id,
        fileType: b.file.type,
        fileUrl: b.file.url,
        cdnUrl: b.file.cdn_url,
        filename: b.file.filename,
        formatName: b.format.id,
        width: b.format.width,
        height: b.format.height,
        templateId: b.template.id,
        templateName: b.template.name
      }));

      let errors = ctx.input.errors.map(e => ({
        templateFormatName: e.template_format_name,
        reason: e.reason
      }));

      return {
        type: 'batch_generation.completed',
        id: ctx.input.generationRequestId,
        output: {
          generationRequestId: ctx.input.generationRequestId,
          banners,
          errors,
          totalGenerated: banners.length,
          totalErrors: errors.length
        }
      };
    }
  })
  .build();
