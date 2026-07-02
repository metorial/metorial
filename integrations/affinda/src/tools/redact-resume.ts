import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let redactResume = SlateTool.create(spec, {
  name: 'Get Redacted Document',
  key: 'redact_resume',
  description: `Retrieve Affinda's redacted PDF for a parsed document. The original document is not modified. The PDF file is returned as a Slate attachment and structured output is limited to metadata.`,
  instructions: [
    'The document must already be uploaded and parsed in Affinda before redaction.',
    'Affinda applies redaction according to the document and account configuration for this endpoint.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentIdentifier: z
        .string()
        .describe('Identifier of the parsed document to retrieve redacted PDF for.')
    })
  )
  .output(
    z.object({
      documentIdentifier: z.string().describe('Identifier of the redacted document.'),
      mimeType: z.string().describe('MIME type of the returned attachment.'),
      byteLength: z.number().describe('Decoded byte length of the returned attachment.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info('Generating redacted document...');

    let file = await client.getRedactedDocument(ctx.input.documentIdentifier);

    return {
      output: {
        documentIdentifier: ctx.input.documentIdentifier,
        mimeType: file.mimeType,
        byteLength: file.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(file.contentBase64, file.mimeType)],
      message: `Redacted PDF generated for document \`${ctx.input.documentIdentifier}\` as an attachment.`
    };
  })
  .build();
