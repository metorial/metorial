import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update an existing document's title, content, emoji, or other properties.
Can also be used to append content to a document or to publish a draft.`,
  instructions: [
    'Use the append option to add content to the end of a document without replacing existing content.'
  ]
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update'),
      title: z.string().optional().describe('New title for the document'),
      text: z
        .string()
        .optional()
        .describe('New markdown content (replaces existing unless append is true)'),
      emoji: z.string().optional().describe('New emoji icon'),
      fullWidth: z
        .boolean()
        .optional()
        .describe('Whether the document should be displayed at full width'),
      append: z
        .boolean()
        .optional()
        .describe('If true, appends text to the end of the document instead of replacing'),
      publish: z.boolean().optional().describe('If true, publishes a draft document'),
      done: z.boolean().optional().describe('Whether the document is marked as done')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      title: z.string(),
      updatedAt: z.string(),
      revision: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let doc = await client.updateDocument({
      id: ctx.input.documentId,
      title: ctx.input.title,
      text: ctx.input.text,
      emoji: ctx.input.emoji,
      fullWidth: ctx.input.fullWidth,
      append: ctx.input.append,
      publish: ctx.input.publish,
      done: ctx.input.done
    });

    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt,
        revision: doc.revision
      },
      message: `Updated document **"${doc.title}"** to revision ${doc.revision}.`
    };
  })
  .build();
