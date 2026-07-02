import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let ocrPdf = SlateTool.create(spec, {
  name: 'OCR PDF',
  key: 'ocr_pdf',
  description: `Apply OCR (Optical Character Recognition) to a scanned PDF or image-based document to create a searchable PDF with selectable text.
Useful for making scanned documents indexable and enabling text extraction.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF or image file content'),
      fileName: z.string().describe('File name with extension'),
      qualityType: z
        .enum(['Draft', 'High'])
        .default('High')
        .describe('"Draft" for faster processing, "High" for better accuracy'),
      ocrOnlyWhenNeeded: z
        .boolean()
        .optional()
        .describe('Only perform OCR if the document does not already contain selectable text'),
      language: z
        .string()
        .optional()
        .describe('Language of the document for better OCR accuracy (e.g. "en", "de", "fr")')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded searchable PDF content'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.ocrPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      qualityType: ctx.input.qualityType,
      ocrWhenNeeded:
        ctx.input.ocrOnlyWhenNeeded !== undefined
          ? String(ctx.input.ocrOnlyWhenNeeded)
          : undefined,
      language: ctx.input.language
    });

    return {
      output: result,
      message: `Successfully applied OCR to create searchable PDF: **${result.fileName}**`
    };
  })
  .build();
