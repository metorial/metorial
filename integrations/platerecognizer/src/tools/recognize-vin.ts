import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeVin = SlateTool.create(spec, {
  name: 'Recognize VIN',
  key: 'recognize_vin',
  description: `Extract a Vehicle Identification Number (VIN) from an image. Submit an image of a VIN label, sticker, or windshield to decode the 17-character VIN code with confidence scores.`,
  instructions: [
    'Provide either an imageUrl or imageBase64, not both.',
    'For best results, ensure the VIN is clearly visible in the image.'
  ],
  constraints: ['Maximum image size is 3 MB.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image containing a VIN'),
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
            vinCode: z.string().describe('Decoded VIN text'),
            orientation: z
              .string()
              .optional()
              .describe('Text orientation (horizontal or vertical)')
          })
        )
        .describe('Detected VIN results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.recognizeVin({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp
    });

    let mappedResults = (result.results || []).map((r: any) => {
      let code = '';
      let orientation = '';
      if (r.identifier?.props?.code) {
        code = r.identifier.props.code.map((c: any) => c.value).join('');
      }
      if (r.identifier?.props?.orientation) {
        orientation = r.identifier.props.orientation.map((o: any) => o.value).join('');
      }
      return {
        vinCode: code,
        orientation: orientation || undefined
      };
    });

    let vinTexts = mappedResults
      .map((r: any) => r.vinCode)
      .filter(Boolean)
      .join(', ');

    return {
      output: {
        processingTime: result.processing_time,
        filename: result.filename,
        results: mappedResults
      },
      message: vinTexts
        ? `Recognized VIN: **${vinTexts}** (processed in ${result.processing_time}ms)`
        : `No VIN detected in the image (processed in ${result.processing_time}ms)`
    };
  })
  .build();
