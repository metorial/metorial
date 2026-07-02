import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let uploadImageTool = SlateTool.create(spec, {
  name: 'Upload Image',
  key: 'upload_image',
  description: `Upload an image to a Roboflow project. Provide either a publicly accessible image URL or base64-encoded image data. Optionally assign the image to a batch, add tags, or specify the dataset split.`,
  instructions: [
    'Provide either imageUrl for a hosted image or base64Data for a base64-encoded image, but not both.',
    'Duplicate images are automatically detected and skipped.'
  ],
  constraints: [
    'Maximum image dimensions: 16,400 x 10,900 pixels.',
    'Supported formats: JPG, PNG, BMP.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug to upload the image to'),
      imageUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL of the image to upload'),
      base64Data: z.string().optional().describe('Base64-encoded image data'),
      fileName: z.string().optional().describe('Filename for the uploaded image'),
      batch: z.string().optional().describe('Batch name to group the image under'),
      tag: z.string().optional().describe('Tag to apply to the image'),
      split: z
        .enum(['train', 'valid', 'test'])
        .optional()
        .describe('Dataset split to assign the image to')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upload succeeded'),
      duplicate: z
        .boolean()
        .optional()
        .describe('Whether the image was already present in the dataset')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let options = {
      name: ctx.input.fileName,
      batch: ctx.input.batch,
      tag: ctx.input.tag,
      split: ctx.input.split
    };

    let result: any;
    if (ctx.input.imageUrl) {
      result = await client.uploadImageByUrl(ctx.input.projectId, ctx.input.imageUrl, options);
    } else if (ctx.input.base64Data) {
      result = await client.uploadImageBase64(
        ctx.input.projectId,
        ctx.input.base64Data,
        options
      );
    } else {
      throw new Error('Either imageUrl or base64Data must be provided.');
    }

    let isDuplicate = result.duplicate === true;

    return {
      output: {
        success: result.success !== false,
        duplicate: isDuplicate
      },
      message: isDuplicate
        ? 'Image was already present in the dataset (duplicate detected).'
        : 'Image uploaded successfully.'
    };
  })
  .build();
