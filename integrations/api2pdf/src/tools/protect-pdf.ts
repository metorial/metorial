import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';
import {
  api2PdfFileOutputSchema,
  fetchApi2PdfAttachment,
  fileAttachment,
  fileOutput
} from './shared';

export let protectPdf = SlateTool.create(spec, {
  name: 'Protect PDF',
  key: 'protect_pdf',
  description: `Add password protection to an existing PDF document. Set a user password (required to open the document) and optionally an owner password (required to change permissions). Useful for compliance and customer-facing delivery.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Publicly accessible URL of the PDF to protect'),
      userPassword: z.string().describe('Password required to open the PDF'),
      ownerPassword: z
        .string()
        .optional()
        .describe(
          'Password required to change PDF permissions (defaults to user password if not provided)'
        ),
      fileName: z.string().optional().describe('Desired file name for the protected PDF'),
      inline: z
        .boolean()
        .optional()
        .describe('If true, the PDF opens in browser; if false, triggers download'),
      extraHttpHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Extra HTTP headers when fetching the source PDF')
    })
  )
  .output(api2PdfFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.pdfSharpPassword({
      url: ctx.input.url,
      userpassword: ctx.input.userPassword,
      ownerpassword: ctx.input.ownerPassword,
      fileName: ctx.input.fileName,
      inline: ctx.input.inline,
      extraHTTPHeaders: ctx.input.extraHttpHeaders
    });

    let file = await fetchApi2PdfAttachment(client, result, 'PDF password protection failed');

    return {
      output: fileOutput(result, file),
      attachments: [fileAttachment(file)],
      message: `Added password protection to PDF (${result.mbOut} MB, ${result.seconds}s) and returned it as a Slate attachment.`
    };
  })
  .build();
