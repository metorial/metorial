import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let protectPdf = SlateTool.create(spec, {
  name: 'Protect PDF',
  key: 'protect_pdf',
  description: `Set password protection on a PDF document with customizable permissions. Control what users can do with the document (print, copy, annotate, etc.).`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      password: z.string().describe('Password to protect the document with'),
      permission: z
        .enum([
          'All',
          'None',
          'Copy',
          'Annotate',
          'FillForms',
          'SupportDisabilities',
          'Assemble',
          'DigitalPrint'
        ])
        .default('All')
        .describe('Permission level for the protected document')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.protect({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      password: ctx.input.password,
      pdfPermission: ctx.input.permission
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully protected PDF with **${ctx.input.permission}** permissions: **${result.fileName}**`
    };
  })
  .build();

export let unlockPdf = SlateTool.create(spec, {
  name: 'Unlock PDF',
  key: 'unlock_pdf',
  description: `Remove password protection from a PDF document. Requires the current password to unlock.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded protected PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      password: z.string().describe('Current password of the protected PDF')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.unlock({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      password: ctx.input.password
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully removed password protection from **${result.fileName}**`
    };
  })
  .build();
