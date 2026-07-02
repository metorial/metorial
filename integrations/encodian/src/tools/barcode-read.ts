import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let barcodeRead = SlateTool.create(spec, {
  name: 'Read Barcode or QR Code',
  key: 'barcode_read',
  description: `Scan and read barcodes or QR codes from documents and images. Extracts the encoded data from barcodes and QR codes found in the provided file.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      codeType: z.enum(['barcode', 'qr_code']).describe('Type of code to read'),
      sourceType: z
        .enum(['document', 'image'])
        .describe('Whether the source is a document (PDF, etc.) or an image file'),
      fileContent: z.string().describe('Base64-encoded file content'),
      fileName: z.string().optional().describe('Filename with extension')
    })
  )
  .output(
    z.object({
      scannedCodes: z.any().describe('Scanned barcode/QR code data'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;
    let body: Record<string, any> = {
      fileContent: ctx.input.fileContent
    };
    if (ctx.input.fileName) body.fileName = ctx.input.fileName;

    if (ctx.input.codeType === 'barcode') {
      if (ctx.input.sourceType === 'document') {
        result = await client.readBarcodeFromDocument(body);
      } else {
        result = await client.readBarcodeFromImage(body);
      }
    } else if (ctx.input.sourceType === 'document') {
      result = await client.readQrCodeFromDocument(body);
    } else {
      result = await client.readQrCodeFromImage(body);
    }

    return {
      output: {
        scannedCodes:
          result.barcodes || result.Barcodes || result.qrCodes || result.QrCodes || result,
        operationId: result.OperationId || ''
      },
      message: `Successfully scanned **${ctx.input.codeType}** from ${ctx.input.sourceType}.`
    };
  })
  .build();
