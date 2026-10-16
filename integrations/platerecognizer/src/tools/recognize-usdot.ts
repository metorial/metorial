import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeUsdot = SlateTool.create(spec, {
  name: 'Recognize USDOT Number',
  key: 'recognize_usdot',
  description: `Read USDOT (US Department of Transportation) numbers from images of trucks and commercial vehicles. Handles blurry, low-resolution, and angled captures.`,
  instructions: [
    'Use imageBase64 for the documented binary image upload. The legacy imageUrl field is forwarded to the provider as before, but URL uploads are not documented for this product. If both fields are supplied, imageUrl takes priority.'
  ],
  constraints: ['Maximum image size is 3 MB.', 'Rate limit: 8 requests/sec.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image containing a USDOT number'),
      imageBase64: z
        .string()
        .optional()
        .describe('Base64-encoded image data; a base64 data URI also preserves its MIME type'),
      imageMimeType: z
        .string()
        .optional()
        .describe(
          'MIME type of the uploaded image, when known; overrides a data URI MIME type'
        ),
      imageFilename: z
        .string()
        .optional()
        .describe('Original filename of the uploaded image, when known'),
      cameraId: z.string().optional().describe('Unique camera identifier'),
      timestamp: z.string().optional().describe('ISO 8601 UTC timestamp'),
      minDetectionScore: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Minimum text-region detection confidence'),
      minOcrScore: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Minimum recognized-text confidence')
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
        .describe('Extracted USDOT number(s)'),
      results: z
        .array(z.unknown())
        .optional()
        .describe('All provider detections and their individual bounding boxes'),
      processingTime: z.number().optional().describe('Processing time in milliseconds'),
      timestamp: z.string().optional(),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeUsdot({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp,
      minDetectionScore: ctx.input.minDetectionScore,
      minOcrScore: ctx.input.minOcrScore,
      imageMimeType: ctx.input.imageMimeType,
      imageFilename: ctx.input.imageFilename
    });

    let detections = Array.isArray(result.results) ? result.results : [result];
    let firstObject = detections.find((item: any) => item.object)?.object;
    let detectedObject = firstObject
      ? {
          label: firstObject.label,
          score: firstObject.score,
          boundingBox: {
            xmin: firstObject.value?.xmin,
            ymin: firstObject.value?.ymin,
            xmax: firstObject.value?.xmax,
            ymax: firstObject.value?.ymax
          }
        }
      : undefined;

    let texts = detections
      .flatMap((item: any) => item.texts ?? [])
      .map((t: any) => ({
        value: t.value,
        score: t.score
      }));

    let dotNumbers = texts.map((t: any) => t.value).join(', ');

    return {
      output: {
        detectedObject,
        texts,
        results: detections,
        processingTime: result.processing_time,
        timestamp: result.timestamp,
        raw: result
      },
      message: dotNumbers
        ? `Recognized USDOT number(s): **${dotNumbers}**`
        : `No USDOT number detected in the image.`
    };
  })
  .build();
