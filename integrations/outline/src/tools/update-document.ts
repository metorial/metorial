import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { requireValue } from '../lib/validation';
import { spec } from '../spec';
export const updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description:
    'Update document title, Markdown, emoji or display settings, or publish a draft. Use lastRevision to guard against concurrent edits.',
  tags: {}
})
  .input(
    z.object({
      lastRevision: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Current revision from get_document; the provider rejects stale updates'),
      editMode: z
        .enum(['replace', 'append', 'prepend', 'patch'])
        .optional()
        .describe('Native text edit mode'),
      findText: z
        .string()
        .optional()
        .describe('Exact Markdown to replace when editMode is patch'),
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
      done: z
        .boolean()
        .optional()
        .describe(
          'Whether the editing session is complete; this does not complete document tasks'
        )
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
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    requireValue(
      !ctx.input.append || !ctx.input.editMode || ctx.input.editMode === 'append',
      'append:true conflicts with this editMode. Use one compatible editing mode.'
    );
    const mode = ctx.input.editMode ?? (ctx.input.append ? 'append' : undefined);
    requireValue(
      (mode !== 'append' && mode !== 'prepend') || !!ctx.input.text,
      'Provide nonempty text for append or prepend.'
    );
    requireValue(
      mode !== 'patch' || (ctx.input.text !== undefined && !!ctx.input.findText),
      'Patch mode requires text and nonempty findText.'
    );
    requireValue(
      ctx.input.findText === undefined || mode === 'patch',
      'findText only applies to patch mode.'
    );
    requireValue(
      Object.entries(ctx.input).some(
        ([k, v]) =>
          !['documentId', 'lastRevision', 'editMode', 'findText', 'append'].includes(k) &&
          v !== undefined
      ),
      'Provide at least one document update field.'
    );
    requireValue(
      (ctx.input.title?.length ?? 0) <= 100 && (ctx.input.text?.length ?? 0) <= 1_536_000,
      'Use a title up to 100 characters and Markdown up to 1,536,000 characters.'
    );
    const { documentId, emoji, ...input } = ctx.input;
    const doc = await client.updateDocument({ ...input, id: documentId, icon: emoji });
    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt,
        revision: doc.revision
      },
      message: `Updated document to revision ${doc.revision}.`
    };
  })
  .build();
