import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  attachmentMetadataSchema,
  streamDocumentAttachment,
  streamDocumentOutput
} from './shared';

export let createImagesFromPdf = SlateTool.create(spec, {
  name: 'Create Images from PDF',
  key: 'create_images_from_pdf',
  description: `Convert PDF pages to images (PNG, JPG, TIFF, BMP). Specify which pages to convert and the desired image width in pixels.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      imageFormat: z
        .enum(['png', 'jpg', 'tiff', 'bmp'])
        .default('png')
        .describe('Output image format'),
      pageNumbers: z
        .string()
        .describe('Comma-separated page numbers to convert (e.g. "1,2,3")'),
      widthPixels: z.number().default(1024).describe('Width of output images in pixels')
    })
  )
  .output(
    z.object({
      images: z.array(attachmentMetadataSchema).describe('Generated images'),
      imageCount: z.number().describe('Number of images generated'),
      attachmentCount: z.number().describe('Number of image attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let pageNums = ctx.input.pageNumbers.split(',').map(p => Number.parseInt(p.trim(), 10));

    let result = await client.createImages({
      docContent: ctx.input.fileContent,
      name: ctx.input.fileName,
      ImageExtension: ctx.input.imageFormat,
      PageNrs: pageNums,
      WidthPixel: ctx.input.widthPixels,
      pageNrs: ctx.input.pageNumbers
    });

    let imageDocuments = result.outputDocuments ?? [];
    let images = imageDocuments.map(streamDocumentOutput);
    let attachments = imageDocuments.map(streamDocumentAttachment);

    return {
      output: { images, imageCount: images.length, attachmentCount: attachments.length },
      attachments,
      message: `Created **${images.length}** ${ctx.input.imageFormat.toUpperCase()} image(s) from PDF pages`
    };
  })
  .build();
