import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let addMarginToPdf = SlateTool.create(spec, {
  name: 'Add Margin to PDF',
  key: 'add_margin_to_pdf',
  description:
    'Add margins in millimeters to any side of a PDF document, adjusting the page layout for print preparation or consistent document formatting.',
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      marginLeft: z.number().min(0).max(100).default(0).describe('Left margin in millimeters'),
      marginRight: z
        .number()
        .min(0)
        .max(100)
        .default(0)
        .describe('Right margin in millimeters'),
      marginTop: z.number().min(0).max(100).default(0).describe('Top margin in millimeters'),
      marginBottom: z
        .number()
        .min(0)
        .max(100)
        .default(0)
        .describe('Bottom margin in millimeters')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addMargin({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      marginLeft: ctx.input.marginLeft,
      marginRight: ctx.input.marginRight,
      marginTop: ctx.input.marginTop,
      marginBottom: ctx.input.marginBottom
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Added margins to **${result.fileName}**`
    };
  })
  .build();
