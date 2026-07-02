import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
      images: z
        .array(
          z.object({
            fileName: z.string().describe('Image file name'),
            fileContent: z.string().describe('Base64-encoded image content')
          })
        )
        .describe('Generated images'),
      imageCount: z.number().describe('Number of images generated')
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

    let images = (result.outputDocuments ?? []).map(doc => ({
      fileName: doc.fileName,
      fileContent: doc.streamFile
    }));

    return {
      output: { images, imageCount: images.length },
      message: `Created **${images.length}** ${ctx.input.imageFormat.toUpperCase()} image(s) from PDF pages`
    };
  })
  .build();
