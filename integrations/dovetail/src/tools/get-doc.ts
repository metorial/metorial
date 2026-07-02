import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDoc = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_doc',
  description: `Retrieve a specific document with its full content and metadata. Optionally export as HTML or Markdown.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('The document ID to retrieve'),
      exportFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Optionally export the document in this format')
    })
  )
  .output(
    z.object({
      docId: z.string(),
      title: z.string(),
      content: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string().optional(),
      projectId: z.string().nullable().optional(),
      projectTitle: z.string().nullable().optional(),
      authors: z.array(z.string()).optional(),
      fields: z
        .array(
          z.object({
            label: z.string(),
            value: z.string().nullable()
          })
        )
        .optional(),
      exportedContent: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.getDoc(ctx.input.docId);

    let exportedContent: any;
    if (ctx.input.exportFormat) {
      exportedContent = await client.exportDoc(ctx.input.docId, ctx.input.exportFormat);
    }

    return {
      output: {
        docId: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        projectId: doc.project?.id ?? null,
        projectTitle: doc.project?.title ?? null,
        authors: doc.authors,
        fields: doc.fields,
        exportedContent
      },
      message: `Retrieved document **${doc.title}**${ctx.input.exportFormat ? ` (exported as ${ctx.input.exportFormat})` : ''}.`
    };
  })
  .build();
