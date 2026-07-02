import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let getGenerationStatus = SlateTool.create(spec, {
  name: 'Get Generation Status',
  key: 'get_generation_status',
  description: `Poll the status of an asynchronous generation request. Returns whether the generation is finalized, along with any generated banners and errors. Use this after calling "Generate Multi-Format" to retrieve results.`,
  constraints: ['Generation requests expire after 7 days.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      generationRequestId: z
        .string()
        .describe('UUID of the generation request returned by "Generate Multi-Format"')
    })
  )
  .output(
    z.object({
      isFinalized: z.boolean().describe('Whether the generation request has completed'),
      generationRequestId: z.string().describe('ID of the generation request'),
      banners: z
        .array(
          z.object({
            bannerId: z.string().describe('Generated banner UUID'),
            fileType: z.string().describe('File type (jpeg, png, pdf, mp4, gif, etc.)'),
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
        .describe('Successfully generated banners'),
      errors: z
        .array(
          z.object({
            templateFormatName: z.string().describe('Format name that failed'),
            reason: z.string().describe('Error description')
          })
        )
        .describe('Errors for formats that failed generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbyssaleClient({ token: ctx.auth.token });

    let result = await client.getGenerationRequestStatus(ctx.input.generationRequestId);

    let banners = result.banners.map(b => ({
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

    let errors = result.errors.map(e => ({
      templateFormatName: e.template_format_name,
      reason: e.reason
    }));

    let status = result.is_finalized ? 'Completed' : 'In progress';
    let errorMsg = errors.length > 0 ? ` with **${errors.length}** error(s)` : '';

    return {
      output: {
        isFinalized: result.is_finalized,
        generationRequestId: result.id,
        banners,
        errors
      },
      message: `Generation request \`${result.id}\`: **${status}**. ${banners.length} banner(s) generated${errorMsg}.`
    };
  })
  .build();
