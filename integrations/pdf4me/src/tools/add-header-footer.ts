import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let addHeaderFooter = SlateTool.create(spec, {
  name: 'Add Header/Footer',
  key: 'add_header_footer',
  description: `Add HTML-formatted content as a header, footer, or both to a PDF document. Supports rich formatting, images, and custom margins.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      htmlContent: z.string().describe('HTML content for the header/footer'),
      location: z
        .enum(['header', 'footer'])
        .default('footer')
        .describe('Where to place the HTML content'),
      pages: z
        .string()
        .default('all')
        .describe('Pages to add header/footer to (e.g. "1,2,3" or "all")'),
      skipFirstPage: z.boolean().optional().describe('Skip the first page'),
      marginLeftPx: z.string().optional().describe('Left margin in pixels'),
      marginRightPx: z.string().optional().describe('Right margin in pixels'),
      marginTopPx: z.string().optional().describe('Top margin in pixels'),
      marginBottomPx: z.string().optional().describe('Bottom margin in pixels')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addHtmlHeaderFooter({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      htmlContent: ctx.input.htmlContent,
      location: ctx.input.location,
      pages: ctx.input.pages,
      skipFirstPage: ctx.input.skipFirstPage,
      marginLeft: ctx.input.marginLeftPx,
      marginRight: ctx.input.marginRightPx,
      marginTop: ctx.input.marginTopPx,
      marginBottom: ctx.input.marginBottomPx
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Added ${ctx.input.location} to **${result.fileName}**`
    };
  })
  .build();
