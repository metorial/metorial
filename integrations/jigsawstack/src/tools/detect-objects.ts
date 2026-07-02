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
        .describe('Whether to return an annotated image with bounding boxes (default: false)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      objects: z
        .array(
          z.object({
            label: z.string().optional(),
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
      annotatedImage: ctx.input.annotatedImage
    });

    let objectCount = result.objects?.length ?? 0;

    return {
      output: {
        success: result.success,
        objects: result.objects,
        guiElements: result.gui_elements,
        tags: result.tags,
        annotatedImageUrl: result.annotated_image
      },
      message: `Detected **${objectCount} objects** in the image.${result.tags?.length ? ` Tags: ${result.tags.join(', ')}.` : ''}`
    };
  })
  .build();
