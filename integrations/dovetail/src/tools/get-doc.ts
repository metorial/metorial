import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exportResponse, mapFields } from '../lib/mappers';
import type { DovetailExport } from '../lib/types';
import { spec } from '../spec';

export let getDoc = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_doc',
  description: `Retrieve document metadata and custom fields. Optionally prepare its full content as a downloadable HTML or Markdown file.`,
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
      fileIds: z.array(z.string()).optional().describe('Associated file IDs for get_file.'),
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

    let exportedContent: DovetailExport | undefined;
    if (ctx.input.exportFormat) {
      exportedContent = await client.exportDoc(ctx.input.docId, ctx.input.exportFormat);
      await ctx.addAttachment({
        type: 'content',
        content: exportResponse(exportedContent, ctx.input.exportFormat),
        filename: `dovetail-doc-${encodeURIComponent(doc.id)}.${ctx.input.exportFormat === 'html' ? 'html' : 'md'}`
      });
    }

    return {
      output: {
        docId: doc.id,
        title: doc.title,
        fileIds: doc.files?.map(file => file.id),
        content: doc.content,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        projectId: doc.project?.id ?? null,
        projectTitle: doc.project?.title ?? null,
        authors: doc.authors,
        fields: mapFields(doc.fields),
        exportedContent
      },
      message: `Retrieved document **${doc.title}**${ctx.input.exportFormat ? ` (exported as ${ctx.input.exportFormat})` : ''}.`
    };
  })
  .build();
