import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

export let generateMultipagePdf = SlateTool.create(spec, {
  key: 'generate_multipage_pdf',
  name: 'Generate Multipage PDF',
  description:
    'Generate a print-ready PDF asynchronously from a printer_multipage design. Inspect pages with get_design, then provide layer overrides per page. Poll get_generation_status for the downloadable result.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      designId: z.string().describe('Multipage design ID from list_designs.'),
      pages: z
        .record(z.string(), z.record(z.string(), z.record(z.string(), z.any())))
        .describe(
          'Overrides keyed by page ID (page_1, page_2, etc.), then by layer name, then property.'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('Webhook URL for the NEW_BANNER_BATCH completion event.'),
      print: z
        .object({
          colorProfile: z
            .string()
            .optional()
            .describe('Provider color profile UUID; omit to use the design profile.'),
          displayCropMarks: z.boolean().optional()
        })
        .optional()
    })
  )
  .output(z.object({ generationRequestId: z.string(), raw: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).generateMultipagePdf(
      ctx.input.designId,
      ctx.input
    );
    return {
      output: { generationRequestId: result.generation_request_id, raw: result },
      message: `Started PDF generation request ${result.generation_request_id}. Use get_generation_status to retrieve the result.`
    };
  })
  .build();
