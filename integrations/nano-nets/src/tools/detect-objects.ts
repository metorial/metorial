import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

let detectedObjectSchema = z.object({
  label: z.string().describe('Object category label'),
  confidence: z.number().describe('Detection confidence score'),
  boundingBox: z
    .object({
      xmin: z.number(),
      ymin: z.number(),
      xmax: z.number(),
      ymax: z.number()
    })
    .describe('Bounding box coordinates of the detected object')
});

export let detectObjects = SlateTool.create(spec, {
  name: 'Detect Objects',
  key: 'detect_objects',
  description: `Detect and locate objects within images using a trained Nanonets object detection model. Returns bounding box coordinates and confidence scores for each detected object.`,
  constraints: ['The object detection model must be trained before running predictions.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the trained object detection model'),
      urls: z
        .array(z.string())
        .min(1)
        .describe('URLs of images to analyze for object detection')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            imageUrl: z.string().describe('URL of the analyzed image'),
            detectedObjects: z
              .array(detectedObjectSchema)
              .describe('Objects detected in the image')
          })
        )
        .describe('Detection results for each image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.detectObjectsByUrl(ctx.input.modelId, ctx.input.urls);

    let results = (result.result || []).map((r: any) => ({
      imageUrl: r.input || r.file || '',
      detectedObjects: (r.prediction || []).map((p: any) => ({
        label: p.label,
        confidence: p.score ?? 0,
        boundingBox: {
          xmin: p.xmin ?? 0,
          ymin: p.ymin ?? 0,
          xmax: p.xmax ?? 0,
          ymax: p.ymax ?? 0
        }
      }))
    }));

    let totalObjects = results.reduce(
      (sum: number, r: any) => sum + r.detectedObjects.length,
      0
    );

    return {
      output: {
        results
      },
      message: `Detected **${totalObjects}** object(s) across **${ctx.input.urls.length}** image(s).`
    };
  })
  .build();
