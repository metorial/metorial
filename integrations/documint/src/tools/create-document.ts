import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Generate a downloadable PDF document by merging data into a Documint template. Provide a template ID and a set of variables (key-value pairs) that correspond to the dynamic tokens in your template.

The variables object should match the tokens defined in the target template. For example, if the template has tokens like \`{{name}}\` and \`{{company}}\`, provide \`{ "name": "John", "company": "Acme" }\`.`,
  instructions: [
    'Use the List Templates tool first if you need to find the correct template ID.',
    'The generated PDF link is only available for 24 hours. Download or upload it to cloud storage if you need to keep it.'
  ],
  constraints: [
    'Documint deletes generated PDFs after 24 hours. Save the downloadable PDF if you need to keep it.'
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
        .min(1)
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
      documentId: z
        .string()
        .describe('Provider identifier or unique generated name of the document.'),
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

    let identifier = result._id ?? result.id ?? result.name;
    if (typeof identifier !== 'string' || !identifier) {
      throw createApiServiceError(
        'Documint returned a document without an identifier or name.'
      );
    }
    let documentId = identifier;
    let documentUrl = result.url ?? result.link;
    if (typeof documentUrl !== 'string' || !documentUrl) {
      throw createApiServiceError('Documint returned a document without a PDF download URL.');
    }
    let name = typeof result.name === 'string' && result.name ? result.name : documentId;
    let filename = `${name.replace(/[\\/\r\n]/g, '_').replace(/\.pdf$/i, '')}.pdf`;
    let content = await client.downloadDocument(documentUrl);
    await ctx.addAttachment({
      type: 'content',
      content,
      filename,
      mimeType: 'application/pdf'
    });

    return {
      output: {
        documentId,
        documentUrl,
        rawResponse: result
      },
      message: `Created document **${documentId}**${ctx.input.preview ? ' (preview mode with watermark)' : ''} and prepared its PDF for download. The original Documint URL expires after 24 hours.`
    };
  })
  .build();
