import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectObjects = SlateTool.create(spec, {
  name: 'Detect Objects',
  key: 'detect_objects',
  description: `Identify and locate objects within images using AI. Returns detected objects with bounding boxes and labels. Optionally provide specific object prompts to search for, and request an annotated image with bounding boxes drawn.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('Image URL to analyze'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key of a previously uploaded image'),
      prompts: z
        .array(z.string())
        .optional()
        .describe('Specific objects to search for (1-150 characters each)'),
      features: z
        .array(z.enum(['object_detection', 'gui']))
        .optional()
        .describe('Detection features to enable (default: ["object_detection", "gui"])'),
      annotatedImage: z
        .boolean()
        .optional()
        .describe('Whether to return an annotated image with bounding boxes (default: false)'),
      returnMasks: z
        .boolean()
        .optional()
        .describe('Return segmentation masks for detected objects')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      rawResponse: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional result details'),
      objects: z
        .array(
          z.object({
            label: z.string().optional(),
            mask: z.string().optional().describe('URL of the object segmentation mask'),
            bounds: z.unknown().optional()
          })
        )
        .optional()
        .describe('Detected objects with labels and bounding boxes'),
      guiElements: z
        .array(
          z.object({
            content: z.string().optional(),
            bounds: z.unknown().optional()
          })
        )
        .optional()
        .describe('Detected GUI elements'),
      tags: z.array(z.string()).optional().describe('Auto-generated descriptive tags'),
      annotatedImageUrl: z
        .string()
        .optional()
        .describe('URL to annotated image (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.detectObjects({
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey,
      prompts: ctx.input.prompts,
      features: ctx.input.features,
      annotatedImage: ctx.input.annotatedImage,
      returnMasks: ctx.input.returnMasks
    });

    let objectCount = result.objects?.length ?? 0;
    if (result.annotated_image) {
      await ctx.addAttachment(
        await client.prepareGeneratedDownload(result.annotated_image, {
          filename: 'annotated-image.png'
        })
      );
    }
    for (let [index, object] of (result.objects ?? []).entries()) {
      if (object.mask)
        await ctx.addAttachment(
          await client.prepareGeneratedDownload(object.mask, {
            filename: `object-mask-${index + 1}.png`
          })
        );
    }

    return {
      output: {
        success: result.success,
        rawResponse: result,
        objects: result.objects,
        guiElements: result.gui_elements?.map(element => ({
          ...element,
          content: element.content ?? undefined
        })),
        tags: result.tags,
        annotatedImageUrl: result.annotated_image
      },
      message: `Detected **${objectCount} objects** in the image.${result.tags?.length ? ` Tags: ${result.tags.join(', ')}.` : ''}`
    };
  })
  .build();
