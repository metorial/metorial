import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fillPdfFields = SlateTool.create(spec, {
  name: 'Fill PDF Form Fields',
  key: 'fill_pdf_fields',
  description: `Fill in fillable form fields in an existing PDF document. Supports text boxes, checkboxes, dropdown menus, and other standard PDF form components. Optionally lock fields as read-only after filling.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      pdfUrl: z.string().describe('URL of the PDF with fillable form fields.'),
      fields: z
        .array(
          z.object({
            fieldName: z.string().describe('Name/ID of the form field to fill.'),
            value: z.string().describe('Value to set for the form field.'),
            readOnly: z
              .boolean()
              .optional()
              .describe('Lock the field as read-only after setting the value.'),
            fontSize: z
              .number()
              .optional()
              .describe('Font size for the field value in points.')
          })
        )
        .describe('List of form fields to fill with their values.'),
      expiration: z
        .number()
        .optional()
        .describe('Expiration time in minutes for the filled PDF URL (1-10080).')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('URL to download the filled PDF.'),
      transactionRef: z.string().describe('Unique transaction reference.'),
      status: z.string().describe('Status of the fill request.'),
      fieldResults: z
        .array(
          z.object({
            fieldName: z.string().describe('Name of the form field.'),
            status: z.string().describe('Status of the field fill operation.')
          })
        )
        .describe('Per-field status results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Filling PDF form fields...');

    let result = await client.updatePdfFields({
      url: ctx.input.pdfUrl,
      fields: ctx.input.fields,
      expiration: ctx.input.expiration
    });

    return {
      output: {
        fileUrl: result.file,
        transactionRef: result.transaction_ref,
        status: result.status,
        fieldResults: (result.fields || []).map(f => ({
          fieldName: f.id,
          status: f.status
        }))
      },
      message: `Filled ${ctx.input.fields.length} form field(s) in the PDF. [Download Filled PDF](${result.file})`
    };
  })
  .build();
