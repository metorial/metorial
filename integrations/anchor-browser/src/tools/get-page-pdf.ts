import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPagePdf = SlateTool.create(spec, {
  name: 'Get Page PDF',
  key: 'get_page_pdf',
  description:
    'Generate a downloadable PDF from a webpage, optionally using an existing browser session for authenticated pages.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().url().describe('URL of the webpage to print'),
      sessionId: z
        .string()
        .optional()
        .describe('Existing session ID returned by create_session or list_sessions'),
      landscape: z.boolean().optional().describe('Use landscape paper orientation'),
      printBackground: z.boolean().optional().describe('Include background graphics'),
      scale: z.number().min(0.1).max(2).optional().describe('Rendering scale from 0.1 to 2'),
      pageRanges: z
        .string()
        .regex(/^\d+(-\d+)?(,\s*\d+(-\d+)?)*$/)
        .optional()
        .describe('Pages to print, such as 1-5, 8; defaults to all pages'),
      preferCSSPageSize: z
        .boolean()
        .optional()
        .describe('Use the page size defined by the webpage CSS')
    })
  )
  .output(z.object({ fileName: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let pdf = await new Client({ token: ctx.auth.token }).pageToPdf(
      {
        url: input.url,
        landscape: input.landscape,
        printBackground: input.printBackground,
        scale: input.scale,
        pageRanges: input.pageRanges,
        preferCSSPageSize: input.preferCSSPageSize
      },
      input.sessionId
    );
    await ctx.addAttachment({
      type: 'content',
      content: pdf,
      filename: 'webpage.pdf',
      mimeType: 'application/pdf'
    });
    return {
      output: { fileName: 'webpage.pdf', mimeType: 'application/pdf' },
      message: `PDF generated for **${input.url}**. Download the PDF to view it.`
    };
  })
  .build();
