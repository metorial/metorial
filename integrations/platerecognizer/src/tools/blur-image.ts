import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let blurImage = SlateTool.create(spec, {
  name: 'Blur Plates and Faces',
  key: 'blur_image',
  description: `Blur license plates and/or faces in an image. Returns the blurred image as base64-encoded data along with detection coordinates for all found plates and faces.
Configurable blur intensity on a scale of 1-10 for both plates and faces independently.`,
  instructions: [
    'Provide either an imageUrl or imageBase64, not both.',
    'Set plates and/or faces blur intensity (1-10). At least one must be specified.',
    'Intensity 1 = lightest blur, 10 = heaviest blur.'
  ],
  constraints: ['Maximum image size is 3 MB.', 'Rate limit applies per account subscription.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image to blur'),
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      platesIntensity: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Blur intensity for license plates (1-10)'),
      facesIntensity: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Blur intensity for faces (1-10)'),
      regions: z
        .array(z.string())
        .optional()
        .describe('Region codes to improve plate detection accuracy'),
      cameraId: z.string().optional().describe('Unique camera identifier')
    })
  )
  .output(
    z.object({
      blurredImageBase64: z.string().describe('Base64-encoded blurred image'),
      blurredImageFilename: z.string().describe('Filename of the blurred image'),
      blurredImageContentType: z.string().describe('Content type of the blurred image'),
      plates: z
        .array(
          z.object({
            box: z
              .object({
                xmin: z.number(),
                ymin: z.number(),
                xmax: z.number(),
                ymax: z.number()
              })
              .optional()
              .describe('Bounding box of the detected plate'),
            score: z.number().optional().describe('Detection confidence')
          })
        )
        .describe('Detected license plates'),
      faces: z
        .array(
          z.object({
            box: z
              .object({
                xmin: z.number(),
                ymin: z.number(),
                xmax: z.number(),
                ymax: z.number()
              })
              .optional()
              .describe('Bounding box of the detected face'),
            score: z.number().optional().describe('Detection confidence')
          })
        )
        .describe('Detected faces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.blurImage({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      plates: ctx.input.platesIntensity,
      faces: ctx.input.facesIntensity,
      regions: ctx.input.regions,
      cameraId: ctx.input.cameraId
    });

    let plateCount = (result.plates || []).length;
    let faceCount = (result.faces || []).length;

    return {
      output: {
        blurredImageBase64: result.blur?.base64 ?? '',
        blurredImageFilename: result.blur?.filename ?? '',
        blurredImageContentType: result.blur?.content_type ?? '',
        plates: (result.plates || []).map((p: any) => ({
          box: p.box,
          score: p.score
        })),
        faces: (result.faces || []).map((f: any) => ({
          box: f.box,
          score: f.score
        }))
      },
      message: `Blurred **${plateCount}** plate(s) and **${faceCount}** face(s) in the image.`
    };
  })
  .build();
