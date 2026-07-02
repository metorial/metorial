import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload a file to Adobe Sign as a transient document. Transient documents are temporary files (valid for 7 days) that can be referenced when creating agreements, web forms, or library templates. You must upload a document before using it in any signing workflow.`,
  constraints: [
    'Transient documents expire after 7 days and must be re-uploaded if needed after expiration.',
    'Supported file types include PDF, DOC, DOCX, and other common document formats.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileName: z
        .string()
        .describe('Name of the file including extension (e.g., "contract.pdf")'),
      fileContent: z.string().describe('Base64-encoded file content'),
      mimeType: z
        .string()
        .optional()
        .describe(
          'MIME type of the file (e.g., "application/pdf"). Defaults to "application/pdf".'
        )
    })
  )
  .output(
    z.object({
      transientDocumentId: z
        .string()
        .describe(
          'ID of the uploaded transient document, used to reference this document when creating agreements'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.uploadTransientDocument({
      fileName: ctx.input.fileName,
      fileContent: ctx.input.fileContent,
      mimeType: ctx.input.mimeType
    });

    return {
      output: result,
      message: `Uploaded **${ctx.input.fileName}** as transient document \`${result.transientDocumentId}\`. This ID can be used to create agreements, web forms, or library templates within the next 7 days.`
    };
  });
