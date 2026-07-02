import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let uploadAnnotationTool = SlateTool.create(spec, {
  name: 'Upload Annotation',
  key: 'upload_annotation',
  description: `Upload an annotation file for a specific image in a project. Supports various annotation formats including YOLO/Darknet, Pascal VOC XML, COCO JSON, and more. The annotation text should match the expected format for the project type.`,
  instructions: [
    'For Darknet/YOLO format, the annotation should contain lines like "class_id x_center y_center width height" with normalized coordinates.',
    'Use the overwrite option to replace existing annotations on the image.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      imageId: z.string().describe('Image ID to annotate'),
      annotationText: z.string().describe('Annotation content in the appropriate format'),
      annotationFileName: z
        .string()
        .optional()
        .describe('Filename for the annotation (e.g., "image.txt" for YOLO format)'),
      overwrite: z.boolean().optional().describe('Whether to overwrite existing annotations')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the annotation was uploaded successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    await client.uploadAnnotation(
      ctx.input.projectId,
      ctx.input.imageId,
      ctx.input.annotationText,
      {
        name: ctx.input.annotationFileName,
        overwrite: ctx.input.overwrite
      }
    );

    return {
      output: { success: true },
      message: `Annotation uploaded successfully for image **${ctx.input.imageId}** in project **${ctx.input.projectId}**.`
    };
  })
  .build();
