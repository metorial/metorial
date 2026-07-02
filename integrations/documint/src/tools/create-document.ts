import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Generate a PDF document by merging data into a Documint template. Provide a template ID and a set of variables (key-value pairs) that correspond to the dynamic tokens in your template. Returns a link to the generated PDF.

The variables object should match the tokens defined in the target template. For example, if the template has tokens like \`{{name}}\` and \`{{company}}\`, provide \`{ "name": "John", "company": "Acme" }\`.`,
  instructions: [
    'Use the List Templates tool first if you need to find the correct template ID.',
    'The generated PDF link is only available for 24 hours. Download or upload it to cloud storage if you need to keep it.'
  ],
  constraints: [
    'PDF links expire after 24 hours.',
    'E-signature features require Silver plan or above and are currently in beta.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe(
          'The ID of the Documint template to merge with. Found at the end of the template URL.'
        ),
      variables: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs of data to merge into the template. Keys should match the dynamic tokens defined in the template.'
        ),
      preview: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'Set to false to create the document without a watermark. Defaults to true (preview mode with watermark).'
        )
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier for the created document.'),
      documentUrl: z
        .string()
        .optional()
        .describe('URL to the generated PDF. Available for 24 hours.'),
      rawResponse: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full response object from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocumintClient(ctx.auth.token);

    ctx.progress(`Creating document from template ${ctx.input.templateId}...`);

    let result = await client.createDocument({
      templateId: ctx.input.templateId,
      variables: ctx.input.variables,
      preview: ctx.input.preview
    });

    let documentId = String(result._id ?? result.id ?? '');
    let documentUrl = result.url
      ? String(result.url)
      : result.link
        ? String(result.link)
        : undefined;

    return {
      output: {
        documentId,
        documentUrl,
        rawResponse: result
      },
      message: `Successfully created document **${documentId}**${ctx.input.preview ? ' (preview mode with watermark)' : ''}.${documentUrl ? `\n\nPDF URL: ${documentUrl}\n\n⚠️ This link expires in 24 hours.` : ''}`
    };
  })
  .build();
