import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let createPdfA = SlateTool.create(spec, {
  name: 'Create PDF/A',
  key: 'create_pdfa',
  description: `Convert a PDF document to PDF/A format for long-term archiving and compliance. Choose from multiple PDF/A standards (1a, 1b, 2a, 2b, 2u, 3a, 3b, 3u).`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      compliance: z
        .enum(['PdfA1b', 'PdfA1a', 'PdfA2b', 'PdfA2u', 'PdfA2a', 'PdfA3b', 'PdfA3u', 'PdfA3a'])
        .default('PdfA2b')
        .describe('PDF/A compliance level'),
      allowUpgrade: z.boolean().optional().describe('Allow upgrading the compliance level'),
      allowDowngrade: z.boolean().optional().describe('Allow downgrading the compliance level')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createPdfA({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      compliance: ctx.input.compliance,
      allowUpgrade: ctx.input.allowUpgrade,
      allowDowngrade: ctx.input.allowDowngrade
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully created **${ctx.input.compliance}** compliant PDF: **${result.fileName}**`
    };
  })
  .build();
