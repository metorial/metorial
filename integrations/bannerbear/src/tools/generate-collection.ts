import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let generateCollection = SlateTool.create(spec, {
  name: 'Generate Collection',
  key: 'generate_collection',
  description: `Generate multiple images simultaneously from a Bannerbear Template Set using a single data payload. Useful for producing a set of related images (e.g. social media posts in multiple sizes) from shared modifications in one API call.`,
  instructions: [
    'Provide a template set UID (not a regular template UID). Template sets group multiple templates together.',
    'Modifications are applied across all templates in the set.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateSetUid: z.string().describe('UID of the template set to generate from'),
      modifications: z
        .array(
          z.object({
            name: z.string().describe('Layer name to modify'),
            text: z.string().optional().describe('Text content'),
            color: z.string().optional().describe('Color (hex)'),
            image_url: z.string().optional().describe('Image URL')
          })
        )
        .describe('List of modifications shared across all templates in the set'),
      transparent: z.boolean().optional().describe('Render with transparent backgrounds'),
      metadata: z.string().optional().describe('Custom metadata to attach'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST when all images are rendered')
    })
  )
  .output(
    z.object({
      collectionUid: z.string().describe('UID of the generated collection'),
      status: z.string().describe('Rendering status'),
      imageUrls: z
        .record(z.string(), z.string())
        .nullable()
        .describe('Map of template name to generated image URL'),
      images: z
        .array(
          z.object({
            imageUid: z.string().describe('UID of the generated image'),
            templateUid: z.string().describe('UID of the template used'),
            imageUrl: z.string().nullable().describe('URL of the generated image'),
            status: z.string().describe('Status of this image')
          })
        )
        .nullable()
        .describe('Detailed list of generated images'),
      createdAt: z.string().describe('Timestamp when the collection was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createCollection({
      template_set: ctx.input.templateSetUid,
      modifications: ctx.input.modifications,
      transparent: ctx.input.transparent,
      metadata: ctx.input.metadata,
      webhook_url: ctx.input.webhookUrl
    });

    let images =
      result.images?.map((img: any) => ({
        imageUid: img.uid,
        templateUid: img.template,
        imageUrl: img.image_url || null,
        status: img.status
      })) || null;

    return {
      output: {
        collectionUid: result.uid,
        status: result.status,
        imageUrls: result.image_urls || null,
        images,
        createdAt: result.created_at
      },
      message: `Collection generation ${result.status === 'completed' ? 'completed' : 'initiated'} (UID: ${result.uid}) with ${result.images?.length || 0} images.`
    };
  })
  .build();
