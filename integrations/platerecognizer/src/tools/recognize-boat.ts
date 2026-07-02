import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeBoat = SlateTool.create(spec, {
  name: 'Recognize Boat ID',
  key: 'recognize_boat',
  description: `Read boat registration numbers from images. Extracts boat identification numbers from vessel images for port security, marina management, and maritime enforcement.`,
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
        .describe('URL of the image containing a boat registration number'),
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
            identifierCode: z.string().describe('Decoded boat registration number'),
            orientation: z
              .string()
              .optional()
              .describe('Text orientation (horizontal or vertical)')
          })
        )
        .describe('Detected boat ID results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeBoat({
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
        ? `Recognized boat ID: **${codes}** (processed in ${result.processing_time}ms)`
        : `No boat ID detected in the image (processed in ${result.processing_time}ms)`
    };
  })
  .build();
