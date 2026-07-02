import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF document from a template by populating its dynamic variables with provided data. Supports text, images, tables, barcodes, QR codes, charts, and conditional elements. Returns either a base64-encoded PDF string or a temporary download URL (valid for 15 minutes).`,
  instructions: [
    'Use the **List Templates** or **Get Template** tools first to discover available templates and their expected variables.',
    'For table data with repeatable rows, pass an array of objects as the variable value.'
  ],
  constraints: [
    'Rate limit: 60 requests per minute by default.',
    'Temporary download URLs expire after 15 minutes.'
  ]
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to generate the PDF from'),
      templateData: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs matching the template variables. Supports strings and arrays of objects for table rows.'
        ),
      outputFormat: z
        .enum(['base64', 'url'])
        .default('base64')
        .describe(
          'Output format: "base64" returns the PDF as a base64-encoded string, "url" returns a temporary download URL valid for 15 minutes'
        )
    })
  )
  .output(
    z.object({
      base64: z
        .string()
        .optional()
        .describe('Base64-encoded PDF content (when outputFormat is "base64")'),
      downloadUrl: z
        .string()
        .optional()
        .describe(
          'Temporary download URL for the generated PDF, valid for 15 minutes (when outputFormat is "url")'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let outputOption = ctx.input.outputFormat === 'url' ? ('url' as const) : ('pdf' as const);

    let result = await client.generatePdf(ctx.input.templateId, ctx.input.templateData, {
      output: outputOption
    });

    return {
      output: {
        base64: result.base64,
        downloadUrl: result.url
      },
      message:
        ctx.input.outputFormat === 'url'
          ? `PDF generated successfully. Download URL provided (expires in 15 minutes).`
          : `PDF generated successfully as base64-encoded content.`
    };
  })
  .build();
