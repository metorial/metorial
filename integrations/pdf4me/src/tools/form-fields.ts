import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let addFormFieldToPdf = SlateTool.create(spec, {
  name: 'Add Form Field to PDF',
  key: 'add_form_field_to_pdf',
  description:
    'Add an interactive TextBox or CheckBox field to a PDF at a specific position and page range.',
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      fieldName: z.string().describe('Name of the form field'),
      fieldType: z.enum(['TextBox', 'CheckBox']).describe('Form field type to add'),
      initialValue: z.string().default('').describe('Initial value for the form field'),
      positionX: z.number().int().describe('X position of the form field on the page'),
      positionY: z.number().int().describe('Y position of the form field on the page'),
      fieldSize: z.number().int().positive().default(4).describe('Size of the form field'),
      pages: z
        .string()
        .default('1')
        .describe('Pages to add the field to, e.g. "1", "1,3", "2-5"')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addFormField({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      initialValue: ctx.input.initialValue,
      positionX: ctx.input.positionX,
      positionY: ctx.input.positionY,
      fieldName: ctx.input.fieldName,
      Size: ctx.input.fieldSize,
      pages: ctx.input.pages,
      formFieldType: ctx.input.fieldType
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Added **${ctx.input.fieldType}** field "${ctx.input.fieldName}" to **${result.fileName}**`
    };
  })
  .build();

export let extractPdfFormData = SlateTool.create(spec, {
  name: 'Extract PDF Form Data',
  key: 'extract_pdf_form_data',
  description:
    'Extract fillable form field names, values, and field types from a PDF form as structured JSON.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF form content'),
      fileName: z.string().describe('PDF form file name')
    })
  )
  .output(
    z.object({
      formFields: z
        .array(
          z.object({
            fieldName: z.string().describe('Form field name'),
            fieldValue: z.string().describe('Current form field value'),
            fieldType: z.string().describe('Form field type')
          })
        )
        .describe('Extracted form fields'),
      fieldCount: z.number().describe('Number of extracted form fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractPdfFormData({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName
    });

    let formFields = result.formFields ?? [];

    return {
      output: {
        formFields,
        fieldCount: formFields.length
      },
      message: `Extracted **${formFields.length}** form field(s) from **${ctx.input.fileName}**`
    };
  })
  .build();
