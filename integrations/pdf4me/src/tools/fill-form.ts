import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let fillPdfForm = SlateTool.create(spec, {
  name: 'Fill PDF Form',
  key: 'fill_pdf_form',
  description: `Fill a PDF form with data provided as a JSON string. Map field names to values to automatically populate form fields.
Optionally keep the form editable after filling.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateContent: z.string().describe('Base64-encoded PDF form template content'),
      templateName: z.string().describe('PDF form template file name'),
      formData: z
        .string()
        .describe(
          'JSON string containing form field data (e.g. [{"field1": "value1", "field2": "value2"}])'
        ),
      keepEditable: z
        .boolean()
        .optional()
        .describe('Keep the PDF form fields editable after filling (default: false)')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.fillPdfForm({
      templateDocContent: ctx.input.templateContent,
      templateDocName: ctx.input.templateName,
      dataArray: ctx.input.formData,
      keepPdfEditable: ctx.input.keepEditable
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully filled PDF form: **${result.fileName}**`
    };
  })
  .build();
