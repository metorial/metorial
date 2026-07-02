import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  attachmentMetadataSchema,
  fileAttachment,
  fileAttachmentOutputSchema,
  fileOutput,
  streamDocumentAttachment,
  streamDocumentOutput
} from './shared';

export let addAttachmentsToPdf = SlateTool.create(spec, {
  name: 'Add Attachments to PDF',
  key: 'add_attachments_to_pdf',
  description:
    'Embed one or more files directly into a PDF document as attachments, creating a PDF package with supporting documents or resources.',
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded source PDF file content'),
      fileName: z.string().describe('Output PDF file name with .pdf extension'),
      attachments: z
        .array(
          z.object({
            fileName: z.string().describe('Attachment file name with extension'),
            fileContent: z.string().describe('Base64-encoded attachment file content')
          })
        )
        .min(1)
        .describe('Files to embed in the PDF')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addAttachmentToPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      attachments: ctx.input.attachments.map(attachment => ({
        docName: attachment.fileName,
        docContent: attachment.fileContent
      }))
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Embedded **${ctx.input.attachments.length}** attachment(s) into **${result.fileName}**`
    };
  })
  .build();

export let extractAttachmentsFromPdf = SlateTool.create(spec, {
  name: 'Extract Attachments from PDF',
  key: 'extract_attachments_from_pdf',
  description:
    'Extract all embedded file attachments from a PDF document and return each extracted file as a Slate attachment.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension')
    })
  )
  .output(
    z.object({
      attachments: z
        .array(attachmentMetadataSchema)
        .describe('Extracted file attachment metadata'),
      attachmentCount: z.number().describe('Number of extracted attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractAttachmentFromPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName
    });

    let documents = result.outputDocuments ?? [];
    let attachments = documents.map(streamDocumentAttachment);
    let outputAttachments = documents.map(streamDocumentOutput);

    return {
      output: {
        attachments: outputAttachments,
        attachmentCount: attachments.length
      },
      attachments,
      message: `Extracted **${attachments.length}** attachment(s) from **${ctx.input.fileName}**`
    };
  })
  .build();
