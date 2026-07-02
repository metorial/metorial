import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
      responseId: z
        .string()
        .describe('Unique ID for this request, can be used to delete the file later'),
      fileUrl: z.string().describe('URL to download the password-protected PDF'),
      mbOut: z.number().describe('Size of the generated file in megabytes'),
      cost: z.number().describe('Cost of this API call in USD'),
      seconds: z.number().describe('Processing time in seconds')
    })
  )
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

    if (!result.success) {
      throw new Error(result.error || 'PDF password protection failed');
    }

    return {
      output: {
        responseId: result.responseId,
        fileUrl: result.fileUrl,
        mbOut: result.mbOut,
        cost: result.cost,
        seconds: result.seconds
      },
      message: `Added password protection to PDF (${result.mbOut} MB, ${result.seconds}s). [Download](${result.fileUrl})`
    };
  })
  .build();
