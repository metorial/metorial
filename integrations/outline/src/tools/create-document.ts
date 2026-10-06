import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { optionalText } from '../lib/schemas';
import { requireValue } from '../lib/validation';
import { spec } from '../spec';
export const createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description:
    'Create a Markdown document in a collection or beneath a parent, optionally using a template. publish defaults to true; set false for a draft.',
  tags: {}
})
  .input(
    z.object({
      title: z.string().describe('Title of the document'),
      text: z.string().optional().describe('Markdown content of the document'),
      collectionId: z.string().optional().describe('Collection to place the document in'),
      parentDocumentId: z.string().optional().describe('Parent document ID for nesting'),
      templateId: z.string().optional().describe('Template to use when creating the document'),
      template: z
        .boolean()
        .optional()
        .describe(
          'Legacy template creation flag. Current instances require their separate template workflow; true is refused before creation.'
        ),
      publish: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to publish immediately; defaults to true. Set false for a draft.'),
      emoji: z.string().optional().describe('Emoji icon for the document'),
      fullWidth: z
        .boolean()
        .optional()
        .describe('Whether the document should be displayed at full width')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      title: z.string(),
      collectionId: optionalText,
      publishedAt: optionalText,
      createdAt: z.string(),
      url: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    requireValue(
      !ctx.input.template,
      'template:true is not supported by the current document create route. Use the Outline template workflow, or provide templateId to create a document from an existing template. No document has been created.'
    );
    requireValue(
      !ctx.input.publish || ctx.input.collectionId || ctx.input.parentDocumentId,
      'Provide collectionId or parentDocumentId to publish, or set publish:false for a draft.'
    );
    requireValue(
      ctx.input.title.length <= 100 && (ctx.input.text?.length ?? 0) <= 1_536_000,
      'Use a title up to 100 characters and Markdown up to 1,536,000 characters.'
    );
    const { template: _template, emoji, ...input } = ctx.input;
    const doc = await client.createDocument({ ...input, icon: emoji });
    requireValue(
      doc.title === ctx.input.title &&
        (ctx.input.collectionId === undefined ||
          doc.collectionId === ctx.input.collectionId) &&
        (ctx.input.parentDocumentId === undefined ||
          doc.parentDocumentId === ctx.input.parentDocumentId) &&
        !!doc.publishedAt === ctx.input.publish,
      'Document creation receipt differs from the requested title, location or publication state. Inspect the returned resource before creating another document.'
    );
    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        collectionId: doc.collectionId,
        publishedAt: doc.publishedAt,
        createdAt: doc.createdAt,
        url: doc.url
      },
      message: `Created a ${doc.publishedAt ? 'published document' : 'draft'}.`
    };
  })
  .build();
