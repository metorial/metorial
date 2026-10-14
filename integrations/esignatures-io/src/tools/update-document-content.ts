import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocumentContent = SlateTool.create(spec, {
  name: 'Update Document Content',
  key: 'update_document_content',
  description:
    'Applies Markdown find-and-replace edits to a contract or template. Supports a dry run to preview the result without saving.',
  instructions: [
    'Read get_document_content first and use the exact existing Markdown in findMarkdown.',
    'An empty findMarkdown replaces the entire body; an empty replaceWithMarkdown deletes matched content.',
    'A heading followed by a trailing newline matches the whole section through the next heading. Use dryRun="yes" to review changes before saving.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      resource: z.enum(['contract', 'template']).describe('Type of document to edit'),
      resourceId: z.string().min(1).describe('ID of the contract or template'),
      dryRun: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Set to yes to return edited content without saving'),
      edits: z
        .array(
          z.object({
            findMarkdown: z
              .string()
              .describe('Exact Markdown to match; empty replaces the entire document'),
            replaceWithMarkdown: z
              .string()
              .describe('Replacement Markdown; empty deletes the matched content')
          })
        )
        .min(1)
        .describe('Ordered content edits')
    })
  )
  .output(
    z.object({
      resource: z.enum(['contract', 'template']),
      resourceId: z.string(),
      status: z.string(),
      dryRun: z.boolean(),
      markdown: z.string().describe('Document content after applying the edits')
    })
  )
  .handleInvocation(async ctx => {
    let { resource, resourceId, edits, dryRun } = ctx.input;
    let result = await new Client(ctx.auth).updateDocumentContent(
      resource,
      resourceId,
      edits,
      dryRun
    );
    let preview = dryRun === 'yes';
    return {
      output: {
        resource,
        resourceId,
        status: result.status,
        dryRun: preview,
        markdown: result.data.markdown
      },
      message: `${preview ? 'Previewed edits for' : 'Updated'} ${resource} **${resourceId}**.`
    };
  })
  .build();
