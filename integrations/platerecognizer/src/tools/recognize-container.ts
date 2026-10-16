import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeContainer = SlateTool.create(spec, {
  name: 'Recognize Shipping Container',
  key: 'recognize_container',
  description: `Read shipping container identification codes from images. Extracts owner code, serial/registration number, and check digit from standard ISO 6346 container markings.
Handles blurry, dark, angled, and shadowy images.`,
  instructions: [
    'Use imageBase64 for the documented binary image upload. For documented URL recognition, use recognize_text with type="shipping_container". The legacy imageUrl field is forwarded to the provider as before, with priority over imageBase64.'
  ],
  constraints: ['Maximum image size is 3 MB.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the image containing a shipping container'),
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
      results: z.array(z.any()).describe('Container identification results from the API'),
      raw: z
        .unknown()
        .optional()
        .describe(
          'Complete provider response including image dimensions and processing metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeContainer({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp,
      minDetectionScore: ctx.input.minDetectionScore,
      minOcrScore: ctx.input.minOcrScore,
      imageMimeType: ctx.input.imageMimeType,
      imageFilename: ctx.input.imageFilename
    });

    let results = Array.isArray(result) ? result : result.results || [result];

    return {
      output: {
        results,
        raw: result
      },
      message:
        results.length > 0
          ? `Detected **${results.length}** container identification(s).`
          : `No container identification detected in the image.`
    };
  })
  .build();
