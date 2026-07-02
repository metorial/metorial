import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

export let generateBarcode = SlateTool.create(spec, {
  name: 'Generate Barcode',
  key: 'generate_barcode',
  description: `Generate a barcode or QR code image. Supports multiple barcode formats including QR_CODE, CODE_39, CODE_128, EAN_13, UPC_A, and more. Returns a URL to download the generated barcode image.`,
  instructions: [
    'Common formats: QR_CODE, CODE_39, CODE_128, EAN_13, EAN_8, UPC_A, UPC_E, ITF, CODABAR, PDF_417, DATA_MATRIX.',
    'For QR codes, the value can be any text, URL, or data string.',
    'For standard barcodes (CODE_39, CODE_128, etc.), the value must follow the format specification.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      format: z
        .string()
        .describe('Barcode format, e.g. "QR_CODE", "CODE_39", "CODE_128", "EAN_13"'),
      value: z.string().describe('The data to encode in the barcode'),
      width: z.number().optional().describe('Width of the barcode image in pixels'),
      height: z.number().optional().describe('Height of the barcode image in pixels'),
      showLabel: z
        .boolean()
        .optional()
        .describe('Whether to display the encoded value as a label below the barcode')
    })
  )
  .output(
    z.object({
      responseId: z
        .string()
        .describe('Unique ID for this request, can be used to delete the file later'),
      fileUrl: z.string().describe('URL to download the generated barcode image'),
      mbOut: z.number().describe('Size of the generated file in megabytes'),
      cost: z.number().describe('Cost of this API call in USD'),
      seconds: z.number().describe('Processing time in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.generateBarcode({
      format: ctx.input.format,
      value: ctx.input.value,
      width: ctx.input.width,
      height: ctx.input.height,
      showlabel: ctx.input.showLabel
    });

    if (!result.success) {
      throw new Error(result.error || 'Barcode generation failed');
    }

    return {
      output: {
        responseId: result.responseId,
        fileUrl: result.fileUrl,
        mbOut: result.mbOut,
        cost: result.cost,
        seconds: result.seconds
      },
      message: `Generated ${ctx.input.format} barcode (${result.seconds}s). [Download](${result.fileUrl})`
    };
  })
  .build();
