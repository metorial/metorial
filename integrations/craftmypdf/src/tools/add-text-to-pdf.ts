import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addTextToPdf = SlateTool.create(spec, {
  name: 'Add Text to PDF',
  key: 'add_text_to_pdf',
  description: `Annotate an existing PDF with dynamic text overlays. Add page numbers, headers, footers, or any custom text at configurable positions on selected pages.
Supports template variables like \`{{pageNumber}}\`, \`{{totalPages}}\`, and \`{{currentIndex}}\` within text.`,
  instructions: [
    'Use "pageSelector" to target specific pages: "1" for page 1, "2-5" for a range, "1,3,5-*" for mixed selection.',
    'Position values: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      pdfUrl: z.string().describe('URL of the PDF to annotate.'),
      textOverlays: z
        .array(
          z.object({
            text: z
              .string()
              .describe(
                'Text content. Supports {{pageNumber}}, {{totalPages}}, {{currentIndex}} variables.'
              ),
            pageSelector: z
              .string()
              .optional()
              .describe(
                'Pages to apply text to. E.g., "1", "2-5", "1,3,5-*". Defaults to all pages.'
              ),
            position: z
              .enum([
                'top-left',
                'top-center',
                'top-right',
                'middle-left',
                'center',
                'middle-right',
                'bottom-left',
                'bottom-center',
                'bottom-right'
              ])
              .optional()
              .describe('Position of the text on the page.'),
            offsetX: z
              .number()
              .optional()
              .describe('Horizontal pixel offset from the position.'),
            offsetY: z
              .number()
              .optional()
              .describe('Vertical pixel offset from the position.'),
            fontSize: z.number().optional().describe('Font size in points.'),
            hexColor: z
              .string()
              .optional()
              .describe('Text color in hex format (e.g., "#000000").'),
            fontFamily: z
              .string()
              .optional()
              .describe('Font family: Helvetica, Courier, Times-Roman, Symbol, ZapfDingbats.'),
            opacity: z.number().optional().describe('Text opacity (0.0 to 1.0).'),
            rotation: z.number().optional().describe('Rotation angle in degrees.')
          })
        )
        .describe('List of text overlays to add to the PDF.'),
      expiration: z
        .number()
        .optional()
        .describe('Expiration time in minutes for the annotated PDF URL (1-10080).')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('URL to download the annotated PDF.'),
      transactionRef: z.string().describe('Unique transaction reference.'),
      status: z.string().describe('Status of the annotation request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Adding text overlays to PDF...');

    let result = await client.addTextToPdf({
      url: ctx.input.pdfUrl,
      textSettings: ctx.input.textOverlays.map(o => ({
        text: o.text,
        pageSelector: o.pageSelector,
        position: o.position,
        offsetX: o.offsetX,
        offsetY: o.offsetY,
        fontSize: o.fontSize,
        hexColor: o.hexColor,
        fontFamily: o.fontFamily,
        opacity: o.opacity,
        rotation: o.rotation
      })),
      expiration: ctx.input.expiration
    });

    return {
      output: {
        fileUrl: result.file,
        transactionRef: result.transaction_ref,
        status: result.status
      },
      message: `Added ${ctx.input.textOverlays.length} text overlay(s) to PDF. [Download Annotated PDF](${result.file})`
    };
  })
  .build();
