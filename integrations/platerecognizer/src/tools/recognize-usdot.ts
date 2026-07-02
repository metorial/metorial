import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeUsdot = SlateTool.create(spec, {
  name: 'Recognize USDOT Number',
  key: 'recognize_usdot',
  description: `Read USDOT (US Department of Transportation) numbers from images of trucks and commercial vehicles. Handles blurry, low-resolution, and angled captures.`,
  instructions: ['Provide either an imageUrl or imageBase64, not both.'],
  constraints: ['Maximum image size is 3 MB.', 'Rate limit: 8 requests/sec.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image containing a USDOT number'),
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      cameraId: z.string().optional().describe('Unique camera identifier'),
      timestamp: z.string().optional().describe('ISO 8601 UTC timestamp')
    })
  )
  .output(
    z.object({
      detectedObject: z
        .object({
          label: z.string().describe('Detection label (e.g. "USDOT")'),
          score: z.number().describe('Detection confidence'),
          boundingBox: z
            .object({
              xmin: z.number(),
              ymin: z.number(),
              xmax: z.number(),
              ymax: z.number()
            })
            .describe('Bounding box of the USDOT area')
        })
        .optional()
        .describe('Detected USDOT label region'),
      texts: z
        .array(
          z.object({
            value: z.string().describe('Extracted USDOT number'),
            score: z.number().describe('OCR confidence')
          })
        )
        .describe('Extracted USDOT number(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeUsdot({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp
    });

    let detectedObject = result.object
      ? {
          label: result.object.label,
          score: result.object.score,
          boundingBox: {
            xmin: result.object.value?.xmin ?? 0,
            ymin: result.object.value?.ymin ?? 0,
            xmax: result.object.value?.xmax ?? 0,
            ymax: result.object.value?.ymax ?? 0
          }
        }
      : undefined;

    let texts = (result.texts || []).map((t: any) => ({
      value: t.value,
      score: t.score
    }));

    let dotNumbers = texts.map((t: any) => t.value).join(', ');

    return {
      output: {
        detectedObject,
        texts
      },
      message: dotNumbers
        ? `Recognized USDOT number(s): **${dotNumbers}**`
        : `No USDOT number detected in the image.`
    };
  })
  .build();
