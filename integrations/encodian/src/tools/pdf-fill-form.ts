import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfFillForm = SlateTool.create(spec, {
  name: 'PDF Fill Form',
  key: 'pdf_fill_form',
  description: `Fill a PDF form with data provided as JSON. Populates form fields in a PDF document with the specified values and optionally flattens the form to prevent further editing.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF form file content'),
      formData: z.string().describe('JSON string mapping form field names to their values'),
      flatten: z
        .boolean()
        .optional()
        .describe('Flatten form fields after filling (prevents editing)')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded filled PDF'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.fillPdfForm({
      fileContent: ctx.input.fileContent,
      formData: ctx.input.formData,
      flattenFormFields: ctx.input.flatten || false
    });

    return {
      output: {
        fileName: result.Filename,
        fileContent: result.FileContent,
        operationId: result.OperationId
      },
      message: `Successfully filled PDF form${ctx.input.flatten ? ' and flattened fields' : ''}.`
    };
  })
  .build();
