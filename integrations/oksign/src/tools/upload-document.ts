import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload a PDF or Word document to OKSign for signing. Word documents (.doc, .docx) are automatically converted to PDF upon upload. Returns a document ID that is used in all subsequent operations (form configuration, notifications, signing).`,
  constraints: [
    'Maximum file size is 10 MB.',
    'Supported formats: PDF, Word (.doc, .docx).',
    'Rate limit: 3 requests per second.',
    'Filename must contain only US-ASCII characters. For non-ASCII filenames, use the filename field in the form descriptor instead.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileContentBase64: z.string().describe('Base64-encoded file content'),
      filename: z
        .string()
        .describe(
          'Filename including extension (e.g. "contract.pdf"). Must be US-ASCII only.'
        ),
      contentType: z
        .enum([
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ])
        .describe('MIME type of the file being uploaded')
    })
  )
  .output(
    z.object({
      documentId: z
        .string()
        .describe(
          'Unique document identifier assigned by OKSign, used for all subsequent operations'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let documentId = await client.uploadDocument(
      ctx.input.fileContentBase64,
      ctx.input.filename,
      ctx.input.contentType
    );

    return {
      output: { documentId },
      message: `Document **${ctx.input.filename}** uploaded successfully. Document ID: \`${documentId}\``
    };
  })
  .build();
