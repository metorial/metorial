import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let imageToJson = SlateTool.create(spec, {
  name: 'Image to JSON',
  key: 'image_to_json',
  description: `Convert image content into structured JSON data using a customizable schema. Provide an image and a schema template, and the module will analyze the image and extract organized data matching your structure.

Useful for extracting data from screenshots, photos of documents, product images, charts, and other visual content.`,
  instructions: [
    'Provide either a file URL or a base64-encoded image string.',
    'Define a schema describing the JSON structure you want to extract from the image.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      schema: z
        .string()
        .describe(
          'JSON schema or template describing the structure of data to extract from the image'
        ),
      fileUrl: z.string().optional().describe('Public URL of the image file'),
      base64String: z.string().optional().describe('Base64-encoded image file content')
    })
  )
  .output(
    z.object({
      extractedJson: z
        .any()
        .describe('Structured JSON data extracted from the image matching the provided schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Extracting JSON from image...');

    let result = await client.imageToJson({
      schema: ctx.input.schema,
      fileUrl: ctx.input.fileUrl,
      base64String: ctx.input.base64String
    });

    return {
      output: {
        extractedJson: result
      },
      message: `Successfully extracted structured JSON data from the image.`
    };
  })
  .build();
