import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Generate an image from a Supportivekoala template by providing the template ID and dynamic parameters.
Use this to programmatically create images with customized text, images, and other content injected into a reusable template.
The generated image is hosted on Supportivekoala's cloud and a URL is returned.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to generate an image from'),
      params: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Key-value pairs to populate the template dynamic fields (e.g., text content, image URLs)'
        ),
      format: z
        .enum(['png', 'jpeg', 'webp'])
        .optional()
        .describe('Output image format. Defaults to png')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('ID of the generated image'),
      templateId: z.string().describe('ID of the template used'),
      imageUrl: z.string().describe('URL of the hosted generated image'),
      createdAt: z.string().describe('Timestamp when the image was created'),
      updatedAt: z.string().describe('Timestamp when the image was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let image = await client.createImage({
      template: ctx.input.templateId,
      params: ctx.input.params,
      format: ctx.input.format
    });

    return {
      output: {
        imageId: image._id,
        templateId: image.template,
        imageUrl: image.imageUrl,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
      },
      message: `Image generated successfully. View it at: ${image.imageUrl}`
    };
  })
  .build();
