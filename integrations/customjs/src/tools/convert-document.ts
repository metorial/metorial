import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let convertDocument = SlateTool.create(spec, {
  name: 'Convert Document',
  key: 'convert_document',
  description: `Converts between document formats. Supports: **Markdown to PDF**, **Markdown to HTML**, **HTML to DOCX** (Word). Useful for generating documents from structured content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      conversion: z
        .enum(['markdown_to_pdf', 'markdown_to_html', 'html_to_docx'])
        .describe('The conversion to perform.'),
      content: z
        .string()
        .describe(
          'The source content to convert (Markdown or HTML depending on the conversion type).'
        )
    })
  )
  .output(
    z.object({
      resultBase64: z
        .string()
        .optional()
        .describe(
          'Base64-encoded binary file. Returned for markdown_to_pdf and html_to_docx.'
        ),
      html: z.string().optional().describe('HTML output. Returned for markdown_to_html.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    switch (ctx.input.conversion) {
      case 'markdown_to_pdf': {
        let resultBase64 = await client.markdownToPdf({ markdown: ctx.input.content });
        return {
          output: { resultBase64 },
          message: `Markdown converted to PDF successfully.`
        };
      }

      case 'markdown_to_html': {
        let html = await client.markdownToHtml({ markdown: ctx.input.content });
        return {
          output: { html },
          message: `Markdown converted to HTML successfully.`
        };
      }

      case 'html_to_docx': {
        let resultBase64 = await client.htmlToDocx({ html: ctx.input.content });
        return {
          output: { resultBase64 },
          message: `HTML converted to DOCX (Word) document successfully.`
        };
      }

      default:
        throw new Error(`Unknown conversion: ${ctx.input.conversion}`);
    }
  })
  .build();
