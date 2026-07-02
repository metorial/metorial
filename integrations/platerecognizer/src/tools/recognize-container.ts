import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeContainer = SlateTool.create(spec, {
  name: 'Recognize Shipping Container',
  key: 'recognize_container',
  description: `Read shipping container identification codes from images. Extracts owner code, serial/registration number, and check digit from standard ISO 6346 container markings.
Handles blurry, dark, angled, and shadowy images.`,
  instructions: ['Provide either an imageUrl or imageBase64, not both.'],
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
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      cameraId: z.string().optional().describe('Unique camera identifier'),
      timestamp: z.string().optional().describe('ISO 8601 UTC timestamp')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Container identification results from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeContainer({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp
    });

    let results = Array.isArray(result) ? result : result.results || [result];

    return {
      output: {
        results
      },
      message:
        results.length > 0
          ? `Detected **${results.length}** container identification(s).`
          : `No container identification detected in the image.`
    };
  })
  .build();
