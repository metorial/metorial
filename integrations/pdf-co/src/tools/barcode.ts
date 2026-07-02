import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateBarcode = SlateTool.create(spec, {
  name: 'Generate Barcode',
  key: 'generate_barcode',
  description: `Generate a barcode image in various formats including QR Code, DataMatrix, Code 39, Code 128, PDF417, and many others.
Returns a URL to the generated barcode image. Optionally embed a logo image inside QR codes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      value: z.string().describe('The data to encode in the barcode'),
      barcodeType: z
        .enum([
          'QRCode',
          'DataMatrix',
          'Code39',
          'Code128',
          'PDF417',
          'EAN13',
          'EAN8',
          'UPCA',
          'UPCE',
          'Codabar',
          'Code93',
          'Interleaved2of5',
          'AztecCode',
          'MaxiCode'
        ])
        .optional()
        .describe('Barcode type (default: QRCode)'),
      outputFileName: z.string().optional().describe('Name for the output barcode image file'),
      decorationImageUrl: z
        .string()
        .optional()
        .describe('URL of a logo image to embed in the center of QR codes')
    })
  )
  .output(
    z.object({
      outputUrl: z.string().describe('URL to download the generated barcode image'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateBarcode({
      value: ctx.input.value,
      type: ctx.input.barcodeType,
      name: ctx.input.outputFileName,
      decorationImage: ctx.input.decorationImageUrl
    });

    if (result.error) {
      throw new Error(`Barcode generation failed: ${result.message || 'Unknown error'}`);
    }

    return {
      output: {
        outputUrl: result.url,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Generated **${ctx.input.barcodeType || 'QRCode'}** barcode. [Download barcode image](${result.url})`
    };
  })
  .build();

export let readBarcode = SlateTool.create(spec, {
  name: 'Read Barcode',
  key: 'read_barcode',
  description: `Read and decode barcodes from images or PDF documents. Supports all popular barcode types including QR Code, Code 128, EAN, DataMatrix, PDF417, and many more.
Returns all detected barcodes with their values, types, confidence scores, and page locations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the image or PDF file to scan for barcodes'),
      barcodeType: z
        .string()
        .optional()
        .describe('Specific barcode type to look for, e.g. "QRCode", "Code128", "EAN13"'),
      barcodeTypes: z
        .string()
        .optional()
        .describe('Comma-separated list of barcode types to scan for'),
      pages: z.string().optional().describe('Page indices to scan, e.g. "0,1,2" (for PDFs)'),
      password: z.string().optional().describe('Password for protected PDF files')
    })
  )
  .output(
    z.object({
      barcodes: z
        .array(
          z.object({
            value: z.string().describe('Decoded barcode value'),
            typeName: z.string().describe('Barcode type name'),
            confidence: z.number().optional().describe('Detection confidence score'),
            page: z.number().describe('Page index where the barcode was found'),
            rect: z.string().describe('Bounding rectangle of the barcode')
          })
        )
        .describe('All detected barcodes'),
      barcodeCount: z.number().describe('Total number of barcodes found'),
      pageCount: z.number().describe('Number of pages scanned'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.readBarcode({
      url: ctx.input.sourceUrl,
      type: ctx.input.barcodeType,
      types: ctx.input.barcodeTypes,
      pages: ctx.input.pages,
      password: ctx.input.password
    });

    if (result.error) {
      throw new Error(`Barcode reading failed: ${result.message || 'Unknown error'}`);
    }

    let barcodes = result.barcodes.map(b => ({
      value: b.Value,
      typeName: b.TypeName,
      confidence: b.Confidence,
      page: b.Page,
      rect: b.Rect
    }));

    return {
      output: {
        barcodes,
        barcodeCount: barcodes.length,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Found **${barcodes.length}** barcode(s) across ${result.pageCount} page(s).${barcodes.length > 0 && barcodes[0] ? ` First barcode: \`${barcodes[0].value}\` (${barcodes[0].typeName})` : ''}`
    };
  })
  .build();
