import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Upload a PDF, image, email file, or other supported document to a Parseur mailbox for asynchronous processing.',
  instructions: [
    'Call list_mailboxes to discover mailbox IDs.',
    'Provide the file bytes as base64 without a data URL prefix.',
    'Successful submission confirms receipt. Call list_documents to check processing status.',
    'documentReference is the upload DocumentID metadata value, distinct from the numeric document ID used by get_document.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      mailboxId: z
        .number()
        .int()
        .positive()
        .describe('Mailbox ID. Call list_mailboxes to discover authorized mailbox IDs.'),
      fileName: z.string().min(1).describe('Original file name, including its extension'),
      contentBase64: z.string().min(1).describe('Base64-encoded file bytes'),
      contentType: z.string().optional().describe('MIME type, such as application/pdf')
    })
  )
  .output(
    z.object({
      submitted: z.boolean().describe('Whether the file was received for processing'),
      mailboxId: z.number().describe('Mailbox that received the upload'),
      files: z.array(
        z.object({
          fileName: z.string().describe('Submitted document name'),
          documentReference: z
            .string()
            .describe('DocumentID metadata value for correlating the uploaded document')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let contentBase64 = ctx.input.contentBase64.replace(/\s/g, '');
    if (
      !/^[A-Za-z0-9+/]+={0,2}$/.test(contentBase64) ||
      getBase64ByteLength(contentBase64) === 0
    ) {
      throw createApiServiceError('Provide non-empty file bytes encoded as base64.');
    }
    let content = Buffer.from(contentBase64, 'base64');
    if (content.toString('base64').replace(/=+$/, '') !== contentBase64.replace(/=+$/, '')) {
      throw createApiServiceError('The file content is not valid base64.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.uploadBinaryDocument(
      ctx.input.mailboxId,
      ctx.input.fileName,
      content,
      ctx.input.contentType
    );

    return {
      output: {
        submitted: true,
        mailboxId: ctx.input.mailboxId,
        files: result.attachments.map(file => ({
          fileName: file.name,
          documentReference: file.DocumentID
        }))
      },
      message: `Submitted **${ctx.input.fileName}** to mailbox ${ctx.input.mailboxId} for processing.`
    };
  })
  .build();
