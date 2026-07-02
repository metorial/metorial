import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Create a new document in the Outline workspace. The document can be placed in a collection, nested under a parent document, or created from a template.
By default, the document is created as a draft unless \`publish\` is set to true.`,
  instructions: [
    'Content should be provided in markdown format.',
    'A collectionId is required to publish the document.'
  ]
})
  .input(
    z.object({
      title: z.string().describe('Title of the document'),
      text: z.string().optional().describe('Markdown content of the document'),
      collectionId: z.string().optional().describe('Collection to place the document in'),
      parentDocumentId: z.string().optional().describe('Parent document ID for nesting'),
      templateId: z.string().optional().describe('Template to use when creating the document'),
      template: z.boolean().optional().describe('If true, creates the document as a template'),
      publish: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to publish the document immediately'),
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
      collectionId: z.string().optional(),
      publishedAt: z.string().optional(),
      createdAt: z.string(),
      url: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let doc = await client.createDocument({
      title: ctx.input.title,
      text: ctx.input.text,
      collectionId: ctx.input.collectionId,
      parentDocumentId: ctx.input.parentDocumentId,
      templateId: ctx.input.templateId,
      template: ctx.input.template,
      publish: ctx.input.publish,
      emoji: ctx.input.emoji,
      fullWidth: ctx.input.fullWidth
    });

    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        collectionId: doc.collectionId,
        publishedAt: doc.publishedAt,
        createdAt: doc.createdAt,
        url: (doc as any).url
      },
      message: `Created document **"${doc.title}"**${doc.publishedAt ? ' (published)' : ' (draft)'}.`
    };
  })
  .build();
