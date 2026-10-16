import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recognizeText = SlateTool.create(spec, {
  name: 'Recognize Text Identifiers',
  key: 'recognize_text',
  description:
    'Extract a VIN, trailer ID, odometer reading, shipping container information, or boat registration number from an image using the current OCR service.',
  instructions: [
    'Provide an imageUrl or imageBase64. When both are supplied, imageUrl takes priority.',
    'Select type="vin", "trailer_id", "odometer", "shipping_container", or "boat_reg_number".',
    'OCR must be enabled on the connected account. Processing typically takes 20–30 seconds per image.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      type: z
        .enum(['vin', 'trailer_id', 'odometer', 'shipping_container', 'boat_reg_number'])
        .describe('Type of identifier to extract'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the image for the provider to download'),
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      cameraId: z.string().optional().describe('Camera identifier included in the response'),
      timestamp: z.string().optional().describe('ISO 8601 UTC image capture timestamp')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          code: z.string().optional().describe('Extracted identifier or reading'),
          orientation: z
            .string()
            .optional()
            .describe(
              'Text orientation when provided; not available for every recognition type'
            ),
          confidence: z.number().optional().describe('Recognition confidence when provided'),
          label: z
            .string()
            .optional()
            .describe('Detected shipping container field label when provided'),
          raw: z.unknown().optional().describe('Complete provider detection')
        })
      ),
      processingTime: z.number().optional().describe('Processing time in milliseconds'),
      filename: z.string().optional().describe('Processed image filename'),
      cameraId: z.string().nullable().optional(),
      timestamp: z.string().optional(),
      raw: z.unknown().optional().describe('Complete provider recognition response')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.imageUrl && !ctx.input.imageBase64) {
      throw createApiServiceError('Provide imageUrl or imageBase64 to recognize text.');
    }
    let result = await new Client({ token: ctx.auth.token }).recognizeText(ctx.input);
    let results = (result.results ?? []).map((item: any) => {
      let identifier = item.identifier;
      let props = identifier?.props;
      let textValue = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
          let first = value[0];
          return typeof first?.value === 'string' ? first.value : undefined;
        }
        return undefined;
      };
      return {
        code: textValue(identifier?.code ?? props?.code),
        orientation: textValue(identifier?.orientation ?? props?.orientation),
        confidence: identifier?.confidence ?? props?.confidence,
        label: textValue(identifier?.label ?? props?.label),
        raw: item
      };
    });
    return {
      output: {
        results,
        processingTime: result.processing_time,
        filename: result.filename,
        cameraId: result.camera_id,
        timestamp: result.timestamp,
        raw: result
      },
      message: `Processed ${ctx.input.type}: **${results.length}** result(s).`
    };
  })
  .build();
