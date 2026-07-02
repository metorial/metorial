import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractFromImage = SlateTool.create(spec, {
  name: 'Extract From Image (vOCR)',
  key: 'extract_from_image',
  description: `Extract structured data from images or PDFs using vision OCR. Provide prompts describing what fields to extract (e.g., "total_price", "tax", "vendor_name" from a receipt). Supports JPEG, JPG, PNG, and multi-page PDFs. Returns extracted context, text sections with positioning data, and auto-generated tags.`,
  instructions: [
    'Provide either a URL or file store key, not both.',
    'Use an array of prompt strings to extract multiple specific fields.',
    'Enable fine-grained mode for better text element positioning accuracy.'
  ],
  constraints: ['Multi-page PDFs support up to 10 pages per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('Image or PDF URL to process'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key of a previously uploaded image or PDF'),
      prompt: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
          'What to extract. Use a string for a general description, or an array of field names (e.g., ["total_price", "tax", "date"]).'
        ),
      fineGrained: z
        .boolean()
        .optional()
        .describe('Enable enhanced OCR for improved text positioning'),
      pageRange: z
        .array(z.number())
        .optional()
        .describe('Two-element array [startPage, endPage] for multi-page PDFs')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      context: z
        .unknown()
        .describe(
          'Extracted data - string for single prompt, or object with keys matching prompt items'
        ),
      width: z.number().optional().describe('Image width in pixels'),
      height: z.number().optional().describe('Image height in pixels'),
      tags: z.array(z.string()).optional().describe('Auto-generated content descriptors'),
      hasText: z.boolean().optional().describe('Whether text was detected in the image'),
      sections: z
        .array(
          z.object({
            text: z.string().optional(),
            lines: z.array(z.unknown()).optional()
          })
        )
        .optional()
        .describe('Text sections with positioning data'),
      totalPages: z.number().optional().describe('Total pages in document (PDFs only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractFromImage({
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey,
      prompt: ctx.input.prompt,
      fineGrained: ctx.input.fineGrained,
      pageRange: ctx.input.pageRange
    });

    return {
      output: {
        success: result.success,
        context: result.context,
        width: result.width,
        height: result.height,
        tags: result.tags,
        hasText: result.has_text,
        sections: result.sections,
        totalPages: result.total_pages
      },
      message: `Extracted data from image.${result.has_text ? ' Text detected in image.' : ''} ${result.tags?.length ? `Tags: ${result.tags.join(', ')}` : ''}`
    };
  })
  .build();
