import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF from HTML',
  key: 'generate_pdf',
  description: `Converts HTML content into a pixel-perfect PDF document. Supports styled HTML with CSS, Nunjucks templating with data variables, and custom page dimensions. Ideal for generating invoices, reports, certificates, and other structured documents.`,
  instructions: [
    'Provide full HTML content including CSS styles for the best results.',
    'Use Nunjucks template syntax (e.g., `{{ variableName }}`) and pass template data to inject dynamic values.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      html: z
        .string()
        .describe(
          'Full HTML content to convert to PDF. Supports inline CSS and Nunjucks templating.'
        ),
      templateData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value data to inject into Nunjucks template variables in the HTML.'),
      widthMm: z
        .number()
        .optional()
        .describe('PDF page width in millimeters. Defaults to 210mm (A4).'),
      heightMm: z
        .number()
        .optional()
        .describe('PDF page height in millimeters. Defaults to 297mm (A4).')
    })
  )
  .output(
    z.object({
      pdfBase64: z.string().describe('Base64-encoded PDF file content.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    let pdfBase64 = await client.htmlToPdf({
      html: ctx.input.html,
      templateData: ctx.input.templateData,
      widthMm: ctx.input.widthMm,
      heightMm: ctx.input.heightMm
    });

    return {
      output: { pdfBase64 },
      message: `PDF generated successfully from HTML content.`
    };
  })
  .build();
