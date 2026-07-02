import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  outputOptionForDelivery,
  pdfAttachments,
  pdfDeliverySchema,
  pdfOutput,
  pdfOutputSchema,
  requireNonEmptyString
} from './shared';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF document from a template by populating its dynamic variables with provided data. Supports text, images, tables, barcodes, QR codes, charts, and conditional elements. Returns either a Slate PDF attachment or a temporary download URL (valid for 15 minutes).`,
  instructions: [
    'Use the **List Templates** or **Get Template** tools first to discover available templates and their expected variables.',
    'For table data with repeatable rows, pass an array of objects as the variable value.',
    'Use outputFormat="attachment" when you need the generated PDF file bytes. The file is returned as a Slate attachment, not inline base64.'
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
      outputFormat: pdfDeliverySchema
    })
  )
  .output(
    pdfOutputSchema.extend({
      templateId: z.string().describe('ID of the template used to generate the PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templateId = requireNonEmptyString(ctx.input.templateId, 'templateId');

    let result = await client.generatePdf(templateId, ctx.input.templateData, {
      output: outputOptionForDelivery(ctx.input.outputFormat)
    });

    let output = {
      templateId,
      ...pdfOutput(result)
    };

    return {
      output,
      attachments: pdfAttachments(result),
      message:
        output.delivery === 'url'
          ? `PDF generated successfully. Download URL provided (expires in 15 minutes).`
          : `PDF generated successfully and returned as a Slate attachment (${output.byteLength} bytes).`
    };
  })
  .build();
