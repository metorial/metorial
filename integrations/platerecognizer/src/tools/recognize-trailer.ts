import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeTrailer = SlateTool.create(spec, {
  name: 'Recognize Trailer ID',
  key: 'recognize_trailer',
  description: `Extract trailer identification numbers from images. Reads trailer IDs from images of commercial trailers with high accuracy.`,
  instructions: ['Provide either an imageUrl or imageBase64, not both.'],
  constraints: ['Maximum image size is 3 MB.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image containing a trailer ID'),
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      cameraId: z.string().optional().describe('Unique camera identifier'),
      timestamp: z.string().optional().describe('ISO 8601 UTC timestamp')
    })
  )
  .output(
    z.object({
      processingTime: z.number().describe('Processing time in milliseconds'),
      filename: z.string().describe('Filename of the processed image'),
      results: z
        .array(
          z.object({
            identifierCode: z.string().describe('Decoded trailer identification text'),
            orientation: z
              .string()
              .optional()
              .describe('Text orientation (horizontal or vertical)')
          })
        )
        .describe('Detected trailer ID results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeTrailer({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp
    });

    let mappedResults = (result.results || []).map((r: any) => {
      let code = '';
      let orientation = '';
      if (r.identifier?.code) {
        code = r.identifier.code;
      } else if (r.identifier?.props?.code) {
        code = r.identifier.props.code.map((c: any) => c.value).join('');
      }
      if (r.identifier?.orientation) {
        orientation = r.identifier.orientation;
      } else if (r.identifier?.props?.orientation) {
        orientation = r.identifier.props.orientation.map((o: any) => o.value).join('');
      }
      return {
        identifierCode: code,
        orientation: orientation || undefined
      };
    });

    let codes = mappedResults
      .map((r: any) => r.identifierCode)
      .filter(Boolean)
      .join(', ');

    return {
      output: {
        processingTime: result.processing_time,
        filename: result.filename,
        results: mappedResults
      },
      message: codes
        ? `Recognized trailer ID: **${codes}** (processed in ${result.processing_time}ms)`
        : `No trailer ID detected in the image (processed in ${result.processing_time}ms)`
    };
  })
  .build();
