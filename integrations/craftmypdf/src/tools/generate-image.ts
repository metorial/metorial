import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate a JPEG or PNG image from a CraftMyPDF template populated with JSON data. Uses the same template system as PDF generation but outputs an image file.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the CraftMyPDF template to use.'),
      templateData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON data to populate the template with.'),
      loadDataFrom: z.string().optional().describe('External URL to load template data from.'),
      version: z.number().optional().describe('Specific template version to use.'),
      outputType: z
        .enum(['jpeg', 'png'])
        .optional()
        .describe('Image output format. Default is "jpeg".'),
      expiration: z
        .number()
        .optional()
        .describe('Expiration time in minutes for the generated image URL (1-10080).'),
      outputFile: z.string().optional().describe('Output filename. Default is "output.jpg".')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('URL to download the generated image.'),
      transactionRef: z.string().describe('Unique transaction reference for this generation.'),
      status: z.string().describe('Status of the image generation request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Generating image...');

    let result = await client.createImage({
      templateId: ctx.input.templateId,
      data: ctx.input.templateData,
      loadDataFrom: ctx.input.loadDataFrom,
      version: ctx.input.version,
      exportType: 'json',
      expiration: ctx.input.expiration,
      outputFile: ctx.input.outputFile,
      outputType: ctx.input.outputType
    });

    return {
      output: {
        fileUrl: result.file,
        transactionRef: result.transaction_ref,
        status: result.status
      },
      message: `Image generated successfully as ${ctx.input.outputType || 'jpeg'}. [Download Image](${result.file})`
    };
  })
  .build();
