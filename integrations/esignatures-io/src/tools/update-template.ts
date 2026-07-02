import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let textStyleSchema = z.object({
  offset: z.number().describe('Character offset where the style starts'),
  length: z.number().describe('Number of characters the style applies to'),
  style: z.enum(['bold', 'italic', 'underline']).describe('Style type')
});

let tableCellSchema = z.object({
  text: z.string().describe('Cell text content'),
  styles: z
    .array(z.enum(['bold', 'italic', 'underline']))
    .optional()
    .describe('Cell text styles'),
  alignment: z.enum(['center', 'right', 'left']).optional().describe('Cell text alignment')
});

let documentElementSchema = z.object({
  type: z
    .enum([
      'text_header_one',
      'text_header_two',
      'text_header_three',
      'text_normal',
      'ordered_list_item',
      'unordered_list_item',
      'signer_field_text',
      'signer_field_text_area',
      'signer_field_date',
      'signer_field_dropdown',
      'signer_field_checkbox',
      'signer_field_radiobutton',
      'signer_field_file_upload',
      'image',
      'table',
      'template'
    ])
    .describe('Type of document element'),
  text: z.string().optional().describe('Text content of the element'),
  textAlignment: z.enum(['center', 'right', 'justify']).optional().describe('Text alignment'),
  autoCounter: z
    .enum(['yes', 'no'])
    .optional()
    .describe('Enable automatic numbering for headers'),
  depth: z.number().optional().describe('Nesting depth for list items'),
  textStyles: z.array(textStyleSchema).optional().describe('Inline text styling'),
  signerFieldAssignedTo: z
    .enum(['first_signer', 'second_signer', 'last_signer', 'every_signer'])
    .optional()
    .describe('Which signer this field is assigned to'),
  signerFieldRequired: z
    .enum(['yes', 'no'])
    .optional()
    .describe('Whether this field is required'),
  signerFieldId: z.string().optional().describe('Unique ID for the field'),
  signerFieldDefaultValue: z.string().optional().describe('Default value for the field'),
  signerFieldPlaceholderText: z.string().optional().describe('Placeholder text'),
  signerFieldMasked: z
    .enum(['yes', 'no'])
    .optional()
    .describe('Whether the field value is hidden from other signers'),
  signerFieldDropdownOptions: z
    .string()
    .optional()
    .describe('Newline-separated dropdown options'),
  imageBase64: z.string().optional().describe('Base64-encoded image'),
  imageAlignment: z.enum(['center', 'right', 'left']).optional().describe('Image alignment'),
  imageHeightRem: z.number().optional().describe('Image height in rem units'),
  imageDownloadEnabled: z
    .enum(['yes', 'no'])
    .optional()
    .describe('Whether image download is enabled'),
  tableCells: z.array(z.array(tableCellSchema)).optional().describe('Table rows and cells'),
  templateId: z.string().optional().describe('ID of a sub-template to embed')
});

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Updates an existing contract template's title, labels, or document elements. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      title: z.string().optional().describe('New title for the template'),
      labels: z.array(z.string()).optional().describe('Updated labels for the template'),
      documentElements: z
        .array(documentElementSchema)
        .optional()
        .describe('Updated document elements')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the update request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { templateId, ...params } = ctx.input;

    ctx.progress('Updating template...');

    let result = await client.updateTemplate(templateId, params);

    return {
      output: {
        status: result?.status || 'queued'
      },
      message: `Template **${templateId}** updated successfully.`
    };
  })
  .build();
