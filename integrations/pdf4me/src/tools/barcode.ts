import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let addBarcodeToPdf = SlateTool.create(spec, {
  name: 'Add Barcode to PDF',
  key: 'add_barcode_to_pdf',
  description: `Add a barcode or QR code to a PDF document. Supports 150+ barcode types including QR codes, Code128, DataMatrix, EAN13, UPC-A, and more.
Configure position, size, opacity, and text display options.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      text: z.string().describe('Data to encode in the barcode'),
      barcodeType: z
        .string()
        .describe(
          'Barcode type (e.g. "qrCode", "code128", "dataMatrix", "ean13", "upcA", "pdf417", "aztec")'
        ),
      pages: z
        .string()
        .default('all')
        .describe('Pages to add the barcode to (e.g. "1,2" or "all")'),
      alignX: z
        .enum(['Left', 'Center', 'Right'])
        .default('Right')
        .describe('Horizontal alignment'),
      alignY: z
        .enum(['Top', 'Middle', 'Bottom'])
        .default('Top')
        .describe('Vertical alignment'),
      heightInMM: z.string().default('0').describe('Barcode height in mm ("0" for auto)'),
      widthInMM: z.string().default('0').describe('Barcode width in mm ("0" for auto)'),
      marginXInMM: z.string().default('0').describe('Horizontal margin in mm'),
      marginYInMM: z.string().default('0').describe('Vertical margin in mm'),
      opacity: z.number().min(0).max(100).default(100).describe('Transparency: 0-100'),
      displayText: z.string().optional().describe('Text to display beside the barcode'),
      hideText: z.boolean().optional().describe('Hide barcode text'),
      isTextAbove: z.boolean().optional().describe('Position text above the barcode')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addBarcode({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      text: ctx.input.text,
      barcodeType: ctx.input.barcodeType,
      pages: ctx.input.pages,
      alignX: ctx.input.alignX,
      alignY: ctx.input.alignY,
      heightInMM: ctx.input.heightInMM,
      widthInMM: ctx.input.widthInMM,
      marginXInMM: ctx.input.marginXInMM,
      marginYInMM: ctx.input.marginYInMM,
      opacity: ctx.input.opacity,
      displayText: ctx.input.displayText,
      hideText: ctx.input.hideText,
      isTextAbove: ctx.input.isTextAbove
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully added **${ctx.input.barcodeType}** barcode to **${result.fileName}**`
    };
  })
  .build();

export let createBarcodeImage = SlateTool.create(spec, {
  name: 'Create Barcode Image',
  key: 'create_barcode_image',
  description: `Create a standalone barcode or QR code image from text. Returns the barcode as an image file.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Data to encode in the barcode'),
      barcodeType: z
        .string()
        .describe('Barcode type (e.g. "qrCode", "code128", "dataMatrix", "ean13", "upcA")'),
      hideText: z.boolean().optional().describe('Hide barcode text in the image')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBarcode({
      text: ctx.input.text,
      barcodeType: ctx.input.barcodeType,
      hideText: ctx.input.hideText
    });

    return {
      output: fileOutput(result),
      attachments: [fileAttachment(result)],
      message: `Successfully created **${ctx.input.barcodeType}** barcode image`
    };
  })
  .build();

export let readBarcodeFromPdf = SlateTool.create(spec, {
  name: 'Read Barcode from PDF',
  key: 'read_barcode_from_pdf',
  description: `Read and extract barcode or QR code data from a PDF document. Returns all detected barcodes with their type, value, and page number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      barcodeTypes: z
        .array(z.string())
        .describe('Barcode types to scan for (e.g. ["qrCode", "code128"])'),
      pages: z.string().optional().describe('Pages to scan (e.g. "1,2" or "all")')
    })
  )
  .output(
    z.object({
      barcodes: z
        .array(
          z.object({
            barcodeType: z.string().describe('Detected barcode type'),
            value: z.string().describe('Decoded barcode value'),
            pageNumber: z.number().describe('Page number where the barcode was found')
          })
        )
        .describe('Detected barcodes'),
      barcodeCount: z.number().describe('Total number of barcodes found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.readBarcode({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      barcodeType: ctx.input.barcodeTypes,
      pages: ctx.input.pages
    });

    let barcodes = (result.barcodes ?? []).map(b => ({
      barcodeType: b.barcodeType,
      value: b.Value,
      pageNumber: b.page
    }));

    return {
      output: { barcodes, barcodeCount: barcodes.length },
      message: `Found **${barcodes.length}** barcode(s) in the PDF`
    };
  })
  .build();
